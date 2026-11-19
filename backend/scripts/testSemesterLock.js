const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const lock = require("../middleware/semesterLock");

async function main() {
  const active = await prisma.schedule.findFirst({
    where: { isActiveSemester: true }
  });

  if (!active) {
    console.error("No active semester found");
    return;
  }

  console.log("Semester:", active.title);

  const closed = await lock.isSemesterClosed(prisma, active.id);
  console.log("Is active semester closed?", closed);
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });