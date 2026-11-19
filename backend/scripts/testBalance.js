const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const h = require("../utils/balanceHelpers");

async function main() {
  const active = await prisma.schedule.findFirst({
    where: { isActiveSemester: true }
  });

  if (!active) {
    console.error("No active semester found");
    return;
  }

  console.log("Semester:", active.title);
  console.log("Semester ID:", active.id);

  const summary = await h.getSemesterBalanceSummary(prisma, active.id);
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error("Error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });