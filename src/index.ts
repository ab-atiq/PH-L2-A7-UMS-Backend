import app from "./app.js";
import config from "./config/index.js";
// async function main() {
//   await prisma.$connect();
//   console.log("Connected to the database successfully.");

//   app.listen(5000, () => {
//     console.log("Server is running on http://localhost:5000");
//   });
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });

if (process.env.NODE_ENV === "development") {
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}

export default app;
