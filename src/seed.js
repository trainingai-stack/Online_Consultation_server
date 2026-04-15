import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db'
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('开始初始化种子数据...');

  const categories = [
    { name: '内科', description: '包括心血管内科、呼吸内科、消化内科等', icon: 'internal', sortOrder: 1 },
    { name: '外科', description: '包括普外科、骨科、神经外科等', icon: 'surgery', sortOrder: 2 },
    { name: '儿科', description: '儿童常见疾病诊治', icon: 'pediatrics', sortOrder: 3 },
    { name: '妇产科', description: '妇科和产科疾病诊治', icon: 'gynecology', sortOrder: 4 },
    { name: '皮肤科', description: '皮肤疾病诊治', icon: 'dermatology', sortOrder: 5 },
    { name: '眼科', description: '眼部疾病诊治', icon: 'ophthalmology', sortOrder: 6 },
    { name: '口腔科', description: '口腔疾病诊治', icon: 'stomatology', sortOrder: 7 },
    { name: '中医科', description: '中医诊疗', icon: 'tcm', sortOrder: 8 }
  ];

  for (const cat of categories) {
    await prisma.doctorCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
  }

  console.log('医生分类初始化完成');
  console.log('种子数据初始化完成');
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
