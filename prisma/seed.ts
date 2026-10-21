/**
 * Seeds the administrator account and demonstration data.
 *
 * Safe to run repeatedly: records use fixed IDs and are only created when
 * missing, so existing data (including changes made in the app) is never reset.
 *
 *   ADMIN_EMAIL / ADMIN_PASSWORD  administrator to create (required)
 *   SEED_SAMPLE_DATA=false        skip the sample jobs and applications
 */
import { z } from "zod";
import type { ApplicationStatus, EmploymentType, JobStatus } from "../src/generated/prisma/enums";
import { calendarDateInTimeZone, fromDateKey } from "../src/lib/dates";
import { hashPassword, verifyPassword } from "../src/server/auth/password";
import { prisma } from "../src/server/db";
import { getBusinessTimeZone } from "../src/server/env";
import { getCvStorage } from "../src/server/storage/cv-storage";
import { buildSamplePdf } from "./sample-pdf";

const adminEnvSchema = z.object({
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email("ADMIN_EMAIL must be a valid email")),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD must be at least 12 characters"),
});

async function seedAdmin() {
  const parsed = adminEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Cannot seed the administrator: ${parsed.error.issues.map((i) => i.message).join("; ")}. ` +
        "Set ADMIN_EMAIL and ADMIN_PASSWORD (see .env.example).",
    );
  }
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = parsed.data;

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    await prisma.adminUser.create({ data: { email, passwordHash: await hashPassword(password) } });
    console.log(`Created administrator ${email} (password taken from ADMIN_PASSWORD).`);
  } else if (!(await verifyPassword(existing.passwordHash, password))) {
    // ADMIN_PASSWORD changed: store the new hash and sign out existing sessions.
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash: await hashPassword(password) },
      }),
      prisma.adminSession.deleteMany({ where: { adminUserId: existing.id } }),
    ]);
    console.log(`Updated the password for administrator ${email}.`);
  } else {
    console.log(`Administrator ${email} already exists.`);
  }
}

type SampleJob = {
  id: string;
  title: string;
  location: string;
  employmentType: EmploymentType;
  status: JobStatus;
  /** Days from today (in the business timezone) to the closing date. */
  closesInDays: number;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
};

const SAMPLE_JOBS: SampleJob[] = [
  {
    id: "a1f3c2d4-5b6e-4f70-8a91-0b2c3d4e5f01",
    title: "Senior Full-Stack Engineer",
    location: "Kigali, Rwanda (Hybrid)",
    employmentType: "FULL_TIME",
    status: "OPEN",
    closesInDays: 30,
    summary:
      "Design, build and run the TypeScript services and web apps that power BrightCore's business platform.",
    description:
      "BrightCore builds dependable software for growing businesses across Rwanda and East Africa. As a Senior Full-Stack Engineer you will own features end to end, from database design to polished user interfaces, and help shape how our product engineering team works.\n\nYou will join a small, collaborative team that values clear code, careful reviews and shipping in small, safe steps. We work in a hybrid model, with two office days a week at our Kigali office.",
    responsibilities: [
      "Design and build features across our Next.js front end and Node.js services",
      "Model data and write efficient, well-tested PostgreSQL queries",
      "Review code and mentor engineers through pairing and thoughtful feedback",
      "Improve reliability through monitoring, testing and incident follow-ups",
      "Work with product and design to break large ideas into small, shippable steps",
    ],
    requirements: [
      "5+ years of professional software engineering experience",
      "Strong TypeScript skills on both the server and the client",
      "Experience designing relational database schemas",
      "A habit of writing automated tests and clear documentation",
      "Excellent written and spoken English; Kinyarwanda or French is a plus",
    ],
  },
  {
    id: "a1f3c2d4-5b6e-4f70-8a91-0b2c3d4e5f02",
    title: "Product Designer",
    location: "Remote (East Africa)",
    employmentType: "CONTRACT",
    status: "OPEN",
    closesInDays: 21,
    summary:
      "Shape simple, accessible experiences for a new invoicing product during a six-month contract.",
    description:
      "We are launching an invoicing product for small businesses and need an experienced product designer to lead its user experience. You will run discovery with customers, turn insights into flows and prototypes, and work closely with engineers through delivery.\n\nThis is a six-month remote contract for designers based in East Africa, with the possibility of extension.",
    responsibilities: [
      "Plan and run customer interviews and usability tests",
      "Create user flows, wireframes and high-fidelity prototypes",
      "Extend our design system with accessible, reusable components",
      "Partner with engineers to review implementation details",
      "Share research findings and design decisions with the wider team",
    ],
    requirements: [
      "3+ years designing web or mobile products",
      "A portfolio that shows your process, not only final screens",
      "Confidence with Figma and modern prototyping tools",
      "Working knowledge of accessibility standards (WCAG 2.2)",
    ],
  },
  {
    id: "a1f3c2d4-5b6e-4f70-8a91-0b2c3d4e5f03",
    title: "Customer Success Associate",
    location: "Musanze, Rwanda",
    employmentType: "PART_TIME",
    status: "OPEN",
    closesInDays: 14,
    summary:
      "Help our customers get set up and stay successful, working 20 hours a week from our Musanze hub.",
    description:
      "Our customers rely on BrightCore every day to run their businesses. As a Customer Success Associate you will be their first point of contact: guiding new customers through onboarding, answering questions and making sure their feedback reaches the product team.\n\nThis is a part-time role (20 hours per week) based at our Musanze hub, with flexible scheduling.",
    responsibilities: [
      "Onboard new customers through calls and short training sessions",
      "Answer support requests by phone, email and chat",
      "Write and update help-centre articles",
      "Record customer feedback and share trends with the product team",
    ],
    requirements: [
      "Excellent communication skills in Kinyarwanda and English",
      "Patience and a genuine interest in solving problems",
      "Comfort learning new software quickly",
      "Previous customer service experience is an advantage",
    ],
  },
  {
    id: "a1f3c2d4-5b6e-4f70-8a91-0b2c3d4e5f04",
    title: "Software Engineering Intern",
    location: "Kigali, Rwanda",
    employmentType: "INTERNSHIP",
    status: "OPEN",
    closesInDays: 45,
    summary:
      "A six-month paid internship for recent graduates who want to grow into professional software engineers.",
    description:
      "Our internship programme pairs you with a senior engineer mentor while you contribute to real features used by our customers. You will learn how a professional team plans, builds, reviews, tests and releases software.\n\nThe programme runs for six months, is paid, and is based at our Kigali office.",
    responsibilities: [
      "Build small features and bug fixes with guidance from your mentor",
      "Write automated tests for the code you change",
      "Take part in planning, code reviews and team demos",
      "Document what you learn for future interns",
    ],
    requirements: [
      "A recent degree or diploma in computer science or a related field, or equivalent experience",
      "Familiarity with JavaScript or TypeScript",
      "Basic understanding of HTML, CSS and Git",
      "Curiosity and a willingness to ask questions",
    ],
  },
  {
    // Still marked OPEN, but its closing date has passed: demonstrates expiry.
    id: "a1f3c2d4-5b6e-4f70-8a91-0b2c3d4e5f05",
    title: "Data Analyst",
    location: "Kigali, Rwanda",
    employmentType: "FULL_TIME",
    status: "OPEN",
    closesInDays: -2,
    summary:
      "Turn product and operations data into clear insights that guide decisions across BrightCore.",
    description:
      "As a Data Analyst you will help teams across BrightCore understand how customers use our products and where we can improve. You will own recurring reports, answer ad-hoc questions and build dashboards that people actually use.\n\nYou will work closely with product managers, engineers and the leadership team.",
    responsibilities: [
      "Build and maintain dashboards for product and operations metrics",
      "Write SQL to answer questions from across the business",
      "Present findings clearly to technical and non-technical audiences",
      "Improve data quality together with the engineering team",
    ],
    requirements: [
      "2+ years in a data or business analyst role",
      "Strong SQL skills and experience with a BI tool",
      "Clear writing and presentation skills",
    ],
  },
  {
    // Manually closed before its closing date: demonstrates the CLOSED status.
    id: "a1f3c2d4-5b6e-4f70-8a91-0b2c3d4e5f06",
    title: "DevOps Engineer",
    location: "Nairobi, Kenya (Hybrid)",
    employmentType: "FULL_TIME",
    status: "CLOSED",
    closesInDays: 10,
    summary: "Keep our cloud infrastructure secure, observable and cost-effective as we grow.",
    description:
      "You will look after the infrastructure behind BrightCore's products: automating deployments, improving monitoring and making sure our systems stay secure and reliable as usage grows.\n\nThis hybrid role is based at our Nairobi office.",
    responsibilities: [
      "Automate infrastructure with infrastructure-as-code",
      "Run and improve our CI/CD pipelines",
      "Own monitoring, alerting and incident response tooling",
      "Review and improve our security posture with the engineering team",
    ],
    requirements: [
      "3+ years operating production systems on a major cloud provider",
      "Experience with containers and infrastructure-as-code",
      "Solid Linux and networking fundamentals",
    ],
  },
  {
    // Unpublished: never visible to candidates until an administrator publishes it.
    id: "a1f3c2d4-5b6e-4f70-8a91-0b2c3d4e5f07",
    title: "HR Business Partner",
    location: "Kigali, Rwanda",
    employmentType: "FULL_TIME",
    status: "DRAFT",
    closesInDays: 40,
    summary: "Partner with team leads to hire, develop and retain great people at BrightCore.",
    description:
      "As our HR Business Partner you will support managers across BrightCore with hiring, performance, development and employee relations, and help us build a workplace where people do their best work.",
    responsibilities: [
      "Advise managers on hiring, performance and development",
      "Run our recruitment process together with hiring teams",
      "Keep HR policies up to date and compliant with Rwandan labour law",
    ],
    requirements: [
      "4+ years in an HR generalist or business partner role",
      "Good knowledge of Rwandan labour law",
      "Excellent judgement and discretion",
    ],
  },
];

type SampleApplication = {
  id: string;
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  status: ApplicationStatus;
  decisionNote: string | null;
};

// Fictional candidates. Every email uses the reserved example.com domain.
const SAMPLE_APPLICATIONS: SampleApplication[] = [
  {
    id: "b2e4d3c5-6a7f-4081-9b12-1c2d3e4f5a01",
    jobId: SAMPLE_JOBS[0].id,
    fullName: "Aline Uwase",
    email: "aline.uwase.sample@example.com",
    phone: "+250 700 000 101",
    status: "PENDING",
    decisionNote: null,
  },
  {
    id: "b2e4d3c5-6a7f-4081-9b12-1c2d3e4f5a02",
    jobId: SAMPLE_JOBS[0].id,
    fullName: "Eric Mugisha",
    email: "eric.mugisha.sample@example.com",
    phone: "+250 700 000 102",
    status: "ACCEPTED",
    decisionNote: "Strong system design interview. Invite to the final round.",
  },
  {
    id: "b2e4d3c5-6a7f-4081-9b12-1c2d3e4f5a03",
    jobId: SAMPLE_JOBS[2].id,
    fullName: "Grace Akinyi",
    email: "grace.akinyi.sample@example.com",
    phone: "+254 700 000 103",
    status: "REJECTED",
    decisionNote: "This role requires Kinyarwanda. Encourage them to apply for future roles.",
  },
  {
    id: "b2e4d3c5-6a7f-4081-9b12-1c2d3e4f5a04",
    jobId: SAMPLE_JOBS[5].id,
    fullName: "Samuel Otieno",
    email: "samuel.otieno.sample@example.com",
    phone: "+254 700 000 104",
    status: "PENDING",
    decisionNote: null,
  },
];

async function seedSampleData() {
  const todayKey = calendarDateInTimeZone(new Date(), getBusinessTimeZone());
  const today = fromDateKey(todayKey);

  let jobsCreated = 0;
  for (const { closesInDays, ...job } of SAMPLE_JOBS) {
    const exists = await prisma.job.findUnique({ where: { id: job.id }, select: { id: true } });
    if (exists) continue;
    const closingDate = new Date(today.getTime() + closesInDays * 86_400_000);
    await prisma.job.create({ data: { ...job, closingDate } });
    jobsCreated += 1;
  }

  const storage = getCvStorage();
  let applicationsCreated = 0;
  for (const sample of SAMPLE_APPLICATIONS) {
    const exists = await prisma.application.findFirst({
      where: { OR: [{ id: sample.id }, { jobId: sample.jobId, email: sample.email }] },
      select: { id: true },
    });
    if (exists) continue;

    const job = SAMPLE_JOBS.find((j) => j.id === sample.jobId);
    const cvStorageKey = await storage.save(
      buildSamplePdf([
        sample.fullName,
        "SAMPLE CV - fictional demonstration data",
        `Email: ${sample.email}`,
        `Phone: ${sample.phone}`,
        `Applying for: ${job?.title ?? "BrightCore role"}`,
      ]),
    );

    try {
      await prisma.application.create({
        data: {
          ...sample,
          coverNote: `[Sample application] I'm excited to apply for the ${job?.title ?? ""} role at BrightCore. This record is fictional demonstration data created by the seed script.`,
          cvStorageKey,
          cvOriginalFilename: `${sample.fullName.replace(/\s+/g, "-")}-CV.pdf`,
          decidedAt: sample.status === "PENDING" ? null : new Date(),
        },
      });
      applicationsCreated += 1;
    } catch (error) {
      await storage.remove(cvStorageKey);
      throw error;
    }
  }

  console.log(
    `Sample data: ${jobsCreated} job(s) and ${applicationsCreated} application(s) created ` +
      `(${SAMPLE_JOBS.length - jobsCreated} job(s) and ${SAMPLE_APPLICATIONS.length - applicationsCreated} application(s) already present).`,
  );
}

async function main() {
  await seedAdmin();
  if (process.env.SEED_SAMPLE_DATA === "false") {
    console.log("SEED_SAMPLE_DATA=false: skipping sample jobs and applications.");
  } else {
    await seedSampleData();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
