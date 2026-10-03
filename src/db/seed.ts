import "dotenv/config";
import { seedScript } from "@/lib/seed";

seedScript()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
