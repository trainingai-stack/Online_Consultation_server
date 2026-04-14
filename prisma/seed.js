const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建医生分类
  const categories = [
    { name: '内科', description: '心血管、呼吸、消化等内科疾病', sortOrder: 1 },
    { name: '外科', description: '普外、骨科、神经外科等', sortOrder: 2 },
    { name: '妇产科', description: '妇科、产科相关疾病', sortOrder: 3 },
    { name: '儿科', description: '儿童常见疾病', sortOrder: 4 },
    { name: '皮肤科', description: '皮肤相关疾病', sortOrder: 5 },
    { name: '中医科', description: '中医诊疗', sortOrder: 6 },
    { name: '心理咨询', description: '心理健康咨询', sortOrder: 7 },
    { name: '全科', description: '全科医疗', sortOrder: 8 }
  ];

  for (const category of categories) {
    await prisma.doctorCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category
    });
  }
  console.log('✅ 医生分类创建完成');

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 创建普通用户
  const testUser = await prisma.user.upsert({
    where: { phone: '13800138000' },
    update: {},
    create: {
      phone: '13800138000',
      password: hashedPassword,
      nickname: '测试用户',
      role: 'USER'
    }
  });
  console.log('✅ 测试用户创建完成:', testUser.phone);

  // 创建测试医生用户
  const testDoctorUser = await prisma.user.upsert({
    where: { phone: '13900139000' },
    update: {},
    create: {
      phone: '13900139000',
      password: hashedPassword,
      nickname: '张医生',
      role: 'DOCTOR'
    }
  });

  // 创建医生资质
  const internalMedicine = await prisma.doctorCategory.findUnique({
    where: { name: '内科' }
  });

  await prisma.doctorProfile.upsert({
    where: { userId: testDoctorUser.id },
    update: {},
    create: {
      userId: testDoctorUser.id,
      realName: '张伟',
      idCard: '110101199001011234',
      licenseNo: '110101199001011234',
      licenseImage: '/uploads/licenses/demo.jpg',
      hospital: '北京协和医院',
      department: '心内科',
      title: '主任医师',
      specialty: '高血压、冠心病、心律失常等心血管疾病',
      introduction: '从事心内科临床工作20年，擅长心血管疾病的诊断和治疗。',
      categoryId: internalMedicine.id,
      verifyStatus: 'APPROVED'
    }
  });
  console.log('✅ 测试医生创建完成:', testDoctorUser.phone);

  // 创建更多测试医生
  const doctors = [
    {
      phone: '13700137000',
      nickname: '李医生',
      realName: '李明',
      hospital: '上海瑞金医院',
      department: '儿科',
      title: '副主任医师',
      categoryName: '儿科',
      specialty: '小儿呼吸系统疾病、儿童保健'
    },
    {
      phone: '13600136000',
      nickname: '王医生',
      realName: '王芳',
      hospital: '广州中山医院',
      department: '皮肤科',
      title: '主任医师',
      categoryName: '皮肤科',
      specialty: '痤疮、湿疹、银屑病等皮肤疾病'
    },
    {
      phone: '13500135000',
      nickname: '刘医生',
      realName: '刘强',
      hospital: '成都华西医院',
      department: '骨科',
      title: '主任医师',
      categoryName: '外科',
      specialty: '脊柱外科、关节置换'
    }
  ];

  for (const doc of doctors) {
    const user = await prisma.user.upsert({
      where: { phone: doc.phone },
      update: {},
      create: {
        phone: doc.phone,
        password: hashedPassword,
        nickname: doc.nickname,
        role: 'DOCTOR'
      }
    });

    const category = await prisma.doctorCategory.findUnique({
      where: { name: doc.categoryName }
    });

    await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        realName: doc.realName,
        idCard: '11010119850101' + Math.floor(1000 + Math.random() * 9000),
        licenseNo: 'LIC' + Date.now() + Math.floor(Math.random() * 1000),
        licenseImage: '/uploads/licenses/demo.jpg',
        hospital: doc.hospital,
        department: doc.department,
        title: doc.title,
        specialty: doc.specialty,
        introduction: `从事${doc.department}临床工作多年，擅长${doc.specialty}。`,
        categoryId: category.id,
        verifyStatus: 'APPROVED'
      }
    });
  }
  console.log('✅ 额外测试医生创建完成');

  console.log('\n🎉 数据库初始化完成！');
  console.log('\n测试账号：');
  console.log('  普通用户: 13800138000 / 123456');
  console.log('  医生用户: 13900139000 / 123456');
  console.log('  其他医生: 13700137000 / 123456');
  console.log('           13600136000 / 123456');
  console.log('           13500135000 / 123456');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
