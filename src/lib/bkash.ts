import httpStatus from "http-status";
import config from "../config/index.js";
import { AppError } from "../utils/AppError.js";
import { ensureRedisConnection, redisClient } from "./redis.js";

const idTokenKey = "bkash:idToken";
const refreshTokenKey = "bkash:refreshToken";

const getBkashIdToken = async () => {
  const requiredConfig = [
    config.bkash_base_url,
    config.bkash_username,
    config.bkash_password,
    config.bkash_app_key,
    config.bkash_app_secret,
  ];
  if (requiredConfig.some((value) => !value)) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "bKash is not configured",
    );
  }

  await ensureRedisConnection();
  const cachedToken = await redisClient.get(idTokenKey);
  if (cachedToken) return cachedToken;

  const refreshToken = await redisClient.get(refreshTokenKey);
  if (refreshToken) {
    const refreshResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/token/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username: config.bkash_username,
          password: config.bkash_password,
        },
        body: JSON.stringify({
          app_key: config.bkash_app_key,
          app_secret: config.bkash_app_secret,
          refresh_token: refreshToken,
        }),
      },
    );
    if (refreshResponse.ok) {
      const result = (await refreshResponse.json()) as {
        id_token?: string;
        refresh_token?: string;
      };
      if (result.id_token) {
        await redisClient.set(idTokenKey, result.id_token, { EX: 3600 });
        if (result.refresh_token) {
          await redisClient.set(refreshTokenKey, result.refresh_token, {
            EX: 60 * 60 * 24 * 28,
          });
        }
        return result.id_token;
      }
    }
  }

  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/token/grant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: config.bkash_username,
        password: config.bkash_password,
      },
      body: JSON.stringify({
        app_key: config.bkash_app_key,
        app_secret: config.bkash_app_secret,
      }),
    },
  );
  if (!response.ok) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "bKash access token grant failed",
    );
  }

  const result = (await response.json()) as {
    id_token?: string;
    refresh_token?: string;
  };
  if (!result.id_token) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "bKash access token was not returned",
    );
  }
  await redisClient.set(idTokenKey, result.id_token, { EX: 3600 });
  if (result.refresh_token) {
    await redisClient.set(refreshTokenKey, result.refresh_token, {
      EX: 60 * 60 * 24 * 28,
    });
  }
  return result.id_token;
};

export { getBkashIdToken };
