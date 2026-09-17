require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const { ContentItem } = require("../models/ContentItem");

const sampleContent = [
  {
    title: "Understanding Microloans and Interest Rates",
    body: "Microloans are small, short-term loans designed for small business owners and women entrepreneurs. Before taking a loan, always check the Annual Percentage Rate (APR) rather than just the monthly interest, and beware of processing fees hidden in the fine print.",
    mediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "loans",
    tags: ["microfinance", "interest", "loans", "business"],
    language: "en",
  },
  {
    title: "SHG Loans (Self-Help Groups) Explained",
    body: "Self-Help Groups (SHGs) allow women in a neighborhood to pool savings and access low-interest bank loans under the NRLM (National Rural Livelihood Mission) scheme without collateral.",
    mediaUrl: "",
    category: "loans",
    tags: ["shg", "women", "collateral-free", "loans"],
    language: "en",
  },
  {
    title: "Atal Pension Yojana (APY) for Lifelong Security",
    body: "Atal Pension Yojana is a government-backed pension scheme for unorganized sector workers. By investing a small monthly amount between ages 18 to 40, you are guaranteed a fixed monthly pension of ₹1,000 to ₹5,000 after age 60.",
    mediaUrl: "",
    category: "retirement",
    tags: ["pension", "apy", "government", "retirement"],
    language: "en",
  },
  {
    title: "Emergency Fund: How to Save for Unforeseen Days",
    body: "An emergency fund should cover 3 to 6 months of essential household expenses. Keep this money in a liquid savings account or recurring deposit (RD), not locked in gold or property.",
    mediaUrl: "",
    category: "retirement",
    tags: ["emergency", "savings", "security", "retirement"],
    language: "en",
  },
  {
    title: "Starting with Recurring Deposits (RD) and Gold Bonds",
    body: "A Recurring Deposit lets you deposit as little as ₹500 every month at guaranteed bank interest. Sovereign Gold Bonds (SGB) offer 2.5% annual interest on top of gold price appreciation with zero making charges.",
    mediaUrl: "",
    category: "investment",
    tags: ["rd", "gold", "investment", "savings"],
    language: "en",
  },
  {
    title: "Mutual Funds SIP: The Power of Compounding",
    body: "Systematic Investment Plans (SIP) allow you to invest small amounts monthly into diversified mutual funds. Over 5-10 years, compounding helps your wealth grow faster than regular savings accounts.",
    mediaUrl: "",
    category: "investment",
    tags: ["sip", "mutual-funds", "compounding", "investment"],
    language: "en",
  },
  {
    title: "Basic Income Tax Slabs and PAN Card Benefits",
    body: "Having a PAN card is necessary to open bank accounts and file taxes. For individuals earning under ₹7 lakh annually under the new tax regime, the effective income tax is zero due to tax rebates.",
    mediaUrl: "",
    category: "taxation",
    tags: ["tax", "pan-card", "rebate", "taxation"],
    language: "en",
  },
  {
    title: "Pradhan Mantri Jan Dhan Yojana (PMJDY)",
    body: "PMJDY provides zero-balance bank accounts with an inbuilt RuPay debit card, ₹2 lakh accidental insurance cover, and an overdraft facility up to ₹10,000 for eligible women.",
    mediaUrl: "",
    category: "schemes",
    tags: ["pmjdy", "jan-dhan", "government-scheme", "schemes"],
    language: "en",
  },
  {
    title: "Sukanya Samriddhi Yojana (SSY) for Girl Child",
    body: "SSY is a high-interest government savings scheme for parents of girls under age 10. The interest earned is completely tax-free and secures funds for higher education and future goals.",
    mediaUrl: "",
    category: "schemes",
    tags: ["ssy", "girl-child", "schemes", "savings"],
    language: "en",
  },
  {
    title: "Beware of OTP & Lottery Fraud: Never Share Passwords",
    body: "Bank managers will never call to ask for your ATM PIN, OTP, or UPI PIN. If someone says 'You won a lottery, pay ₹500 fee to claim', it is 100% a scam. Block the number and report immediately.",
    mediaUrl: "",
    category: "scam_alert",
    tags: ["fraud", "otp", "cybersecurity", "scam_alert"],
    language: "en",
  },
  {
    title: "Loan App Traps: Instant Fake Loan Scams",
    body: "Never install unauthorized loan apps from WhatsApp or SMS APK links. Legitimate lending apps must be registered with RBI as NBFCs or commercial banks. Fake apps steal your contacts and blackmail.",
    mediaUrl: "",
    category: "scam_alert",
    tags: ["fake-apps", "safety", "rbi", "scam_alert"],
    language: "en",
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);

  console.log("Cleaning existing content items...");
  await ContentItem.deleteMany({});

  console.log(`Inserting ${sampleContent.length} sample ContentItem records...`);
  const inserted = await ContentItem.insertMany(sampleContent);
  console.log(`✔ Successfully seeded ${inserted.length} content items across categories:`);
  const categories = [...new Set(inserted.map((i) => i.category))];
  console.log("  Categories present:", categories.join(", "));

  await mongoose.disconnect();
  console.log("Done!");
}

if (require.main === module) {
  seed().catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  });
}

module.exports = { sampleContent, seed };
