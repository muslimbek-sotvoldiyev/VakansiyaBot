import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3001)
  console.log("Vacancy bot server is running on port 3000")
}
bootstrap()
