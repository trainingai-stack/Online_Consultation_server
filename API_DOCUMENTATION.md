# P2P线上问诊系统 API 文档

## 项目概述

这是一个基于 Express + Prisma + SQLite 的 P2P 线上问诊应用后端服务。

### 技术栈
- **框架**: Express.js
- **数据库**: SQLite + Prisma ORM
- **实时通信**: Socket.IO
- **认证**: JWT

### 测试账号
```
普通用户: 13800138000 / 123456
医生用户: 13900139000 / 123456
其他医生: 13700137000 / 123456
          13600136000 / 123456
          13500135000 / 123456
```

---

## 基础信息

### 基础URL
```
http://localhost:3001/api
```

### 响应格式
所有API返回统一格式的JSON：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {},
  "success": true
}
```

### 状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

### 认证方式
在请求头中添加：
```
Authorization: Bearer <token>
```

---

## 认证模块

### 1. 用户注册

**POST** `/auth/register`

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号 |
| password | string | 是 | 密码（至少6位） |
| nickname | string | 否 | 昵称 |

#### 请求示例
```json
{
  "phone": "13800138001",
  "password": "123456",
  "nickname": "新用户"
}
```

#### 响应示例
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 10,
      "phone": "13800138001",
      "nickname": "新用户",
      "avatar": null,
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T08:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "success": true
}
```

---

### 2. 用户登录

**POST** `/auth/login`

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号 |
| password | string | 是 | 密码 |

#### 请求示例
```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

#### 响应示例
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "phone": "13800138000",
      "nickname": "测试用户",
      "avatar": null,
      "role": "USER",
      "status": "ACTIVE",
      "doctorProfile": null
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "success": true
}
```

---

### 3. 获取当前用户信息

**GET** `/auth/me`

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "phone": "13800138000",
    "nickname": "测试用户",
    "avatar": null,
    "role": "USER",
    "status": "ACTIVE",
    "doctorProfile": null
  },
  "success": true
}
```

---

### 4. 更新用户信息

**PUT** `/auth/profile`

#### 请求头
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称 |
| avatar | file | 否 | 头像图片 |

#### 响应示例
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": 1,
    "phone": "13800138000",
    "nickname": "新昵称",
    "avatar": "/uploads/avatars/avatar-123.jpg"
  },
  "success": true
}
```

---

### 5. 修改密码

**POST** `/auth/change-password`

#### 请求头
```
Authorization: Bearer <token>
```

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 原密码 |
| newPassword | string | 是 | 新密码（至少6位） |

#### 请求示例
```json
{
  "oldPassword": "123456",
  "newPassword": "newpassword"
}
```

---

### 6. 选择角色（成为医生）

**POST** `/auth/select-role`

#### 请求头
```
Authorization: Bearer <token>
```

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| role | string | 是 | 角色：USER 或 DOCTOR |

#### 请求示例
```json
{
  "role": "DOCTOR"
}
```

#### 响应示例
```json
{
  "code": 200,
  "message": "角色切换成功",
  "data": {
    "user": {
      "id": 2,
      "role": "DOCTOR"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "success": true
}
```

> **注意**: 切换为 DOCTOR 角色前，必须先提交医生资质并通过审核。

---

## 医生模块

### 1. 获取首页数据

**GET** `/doctors/home`

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "内科",
        "description": "心血管、呼吸、消化等内科疾病",
        "sortOrder": 1
      }
    ],
    "doctors": [
      {
        "id": 2,
        "nickname": "张医生",
        "avatar": null,
        "realName": "张伟",
        "hospital": "北京协和医院",
        "department": "心内科",
        "title": "主任医师",
        "specialty": "高血压、冠心病、心律失常等心血管疾病",
        "category": {
          "id": 1,
          "name": "内科"
        }
      }
    ]
  },
  "success": true
}
```

---

### 2. 获取医生分类列表

**GET** `/doctors/categories`

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "name": "内科",
      "icon": null,
      "description": "心血管、呼吸、消化等内科疾病",
      "sortOrder": 1
    },
    {
      "id": 2,
      "name": "外科",
      "icon": null,
      "description": "普外、骨科、神经外科等",
      "sortOrder": 2
    }
  ],
  "success": true
}
```

---

### 3. 获取医生列表

**GET** `/doctors`

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| categoryId | number | 否 | 分类ID |
| keyword | string | 否 | 搜索关键词 |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 2,
        "nickname": "张医生",
        "avatar": null,
        "realName": "张伟",
        "hospital": "北京协和医院",
        "department": "心内科",
        "title": "主任医师",
        "specialty": "高血压、冠心病、心律失常等心血管疾病",
        "category": {
          "id": 1,
          "name": "内科"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 5,
      "totalPages": 1
    }
  },
  "success": true
}
```

---

### 4. 获取医生详情

**GET** `/doctors/:id`

#### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 医生用户ID |

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 2,
    "nickname": "张医生",
    "avatar": null,
    "realName": "张伟",
    "hospital": "北京协和医院",
    "department": "心内科",
    "title": "主任医师",
    "specialty": "高血压、冠心病、心律失常等心血管疾病",
    "introduction": "从事心内科临床工作20年，擅长心血管疾病的诊断和治疗。",
    "category": {
      "id": 1,
      "name": "内科"
    },
    "completedConsultations": 10,
    "joinedAt": "2024-01-15T08:00:00.000Z"
  },
  "success": true
}
```

---

### 5. 提交医生资质认证

**POST** `/doctors/apply`

#### 请求头
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| realName | string | 是 | 真实姓名 |
| idCard | string | 是 | 身份证号 |
| licenseNo | string | 是 | 执业证号 |
| licenseImage | file | 是 | 执业资质证明图片 |
| hospital | string | 是 | 所属医院 |
| department | string | 是 | 科室 |
| title | string | 是 | 职称 |
| specialty | string | 否 | 擅长领域 |
| introduction | string | 否 | 个人简介 |
| categoryId | number | 否 | 所属分类ID |

#### 响应示例
```json
{
  "code": 200,
  "message": "资质认证提交成功，请等待审核",
  "data": {
    "id": 1,
    "realName": "张伟",
    "idCard": "110101199001011234",
    "licenseNo": "110101199001011234",
    "licenseImage": "/uploads/licenses/license-123.jpg",
    "hospital": "北京协和医院",
    "department": "心内科",
    "title": "主任医师",
    "verifyStatus": "PENDING",
    "category": {
      "id": 1,
      "name": "内科"
    }
  },
  "success": true
}
```

---

### 6. 获取我的医生资质

**GET** `/doctors/my/profile`

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "realName": "张伟",
    "licenseNo": "110101199001011234",
    "hospital": "北京协和医院",
    "department": "心内科",
    "title": "主任医师",
    "verifyStatus": "APPROVED",
    "category": {
      "id": 1,
      "name": "内科"
    }
  },
  "success": true
}
```

---

### 7. 更新医生资质

**PUT** `/doctors/my/profile`

#### 请求头
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hospital | string | 否 | 所属医院 |
| department | string | 否 | 科室 |
| title | string | 否 | 职称 |
| specialty | string | 否 | 擅长领域 |
| introduction | string | 否 | 个人简介 |
| categoryId | number | 否 | 所属分类ID |
| licenseImage | file | 否 | 新的资质证明（会重新触发审核） |

---

## 问诊模块

### 1. 发起问诊

**POST** `/consultations`

#### 请求头
```
Authorization: Bearer <token>
```

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| doctorId | number | 是 | 医生ID |
| symptoms | string | 是 | 症状描述（至少5个字符） |

#### 请求示例
```json
{
  "doctorId": 2,
  "symptoms": "最近感觉胸闷气短，偶尔有心悸的症状，请医生帮忙看看。"
}
```

#### 响应示例
```json
{
  "code": 200,
  "message": "问诊发起成功，等待医生接诊",
  "data": {
    "id": 1,
    "patientId": 1,
    "doctorId": 2,
    "status": "PENDING",
    "symptoms": "最近感觉胸闷气短，偶尔有心悸的症状，请医生帮忙看看。",
    "createdAt": "2024-01-15T09:00:00.000Z",
    "patient": {
      "id": 1,
      "nickname": "测试用户",
      "avatar": null
    },
    "doctor": {
      "id": 2,
      "nickname": "张医生",
      "avatar": null
    }
  },
  "success": true
}
```

---

### 2. 获取问诊列表

**GET** `/consultations`

#### 请求头
```
Authorization: Bearer <token>
```

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态：PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| role | string | 否 | 角色视角：user 或 doctor |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "status": "IN_PROGRESS",
        "symptoms": "最近感觉胸闷气短...",
        "diagnosis": null,
        "prescription": null,
        "startedAt": "2024-01-15T09:05:00.000Z",
        "endedAt": null,
        "createdAt": "2024-01-15T09:00:00.000Z",
        "messageCount": 5,
        "patient": {
          "id": 1,
          "nickname": "测试用户",
          "avatar": null
        },
        "doctor": {
          "id": 2,
          "nickname": "张医生",
          "avatar": null,
          "hospital": "北京协和医院",
          "department": "心内科",
          "title": "主任医师"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "success": true
}
```

---

### 3. 获取问诊详情

**GET** `/consultations/:id`

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 问诊ID |

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "status": "COMPLETED",
    "symptoms": "最近感觉胸闷气短...",
    "diagnosis": "考虑为工作压力导致的植物神经功能紊乱",
    "prescription": "建议休息，适当运动，必要时可服用谷维素",
    "startedAt": "2024-01-15T09:05:00.000Z",
    "endedAt": "2024-01-15T09:30:00.000Z",
    "createdAt": "2024-01-15T09:00:00.000Z",
    "patient": {
      "id": 1,
      "nickname": "测试用户",
      "avatar": null,
      "phone": "13800138000"
    },
    "doctor": {
      "id": 2,
      "nickname": "张医生",
      "avatar": null,
      "hospital": "北京协和医院",
      "department": "心内科",
      "title": "主任医师",
      "specialty": "高血压、冠心病、心律失常等心血管疾病"
    },
    "messages": [
      {
        "id": 1,
        "type": "TEXT",
        "content": "医生您好，我最近工作压力比较大",
        "mediaUrl": null,
        "isRead": true,
        "createdAt": "2024-01-15T09:10:00.000Z",
        "sender": {
          "id": 1,
          "nickname": "测试用户",
          "avatar": null
        }
      }
    ]
  },
  "success": true
}
```

---

### 4. 医生接诊

**POST** `/consultations/:id/accept`

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 问诊ID |

#### 响应示例
```json
{
  "code": 200,
  "message": "接诊成功",
  "data": {
    "id": 1,
    "status": "IN_PROGRESS",
    "startedAt": "2024-01-15T09:05:00.000Z"
  },
  "success": true
}
```

---

### 5. 完成问诊

**POST** `/consultations/:id/complete`

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 问诊ID |

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| diagnosis | string | 否 | 诊断结果（医生填写） |
| prescription | string | 否 | 处方建议（医生填写） |

#### 请求示例
```json
{
  "diagnosis": "考虑为工作压力导致的植物神经功能紊乱",
  "presscription": "建议休息，适当运动"
}
```

---

### 6. 取消问诊

**POST** `/consultations/:id/cancel`

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 问诊ID |

---

### 7. 获取待接诊列表（医生）

**GET** `/consultations/pending`

#### 请求头
```
Authorization: Bearer <token>
```

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

---

## 消息模块

### 1. 发送消息

**POST** `/messages`

#### 请求头
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| consultationId | number | 是 | 问诊ID |
| content | string | 是 | 消息内容 |
| type | string | 否 | 类型：TEXT, IMAGE, VOICE，默认TEXT |
| media | file | 否 | 媒体文件（图片或语音） |

#### 响应示例
```json
{
  "code": 200,
  "message": "发送成功",
  "data": {
    "id": 1,
    "consultationId": 1,
    "senderId": 1,
    "type": "TEXT",
    "content": "医生您好",
    "mediaUrl": null,
    "isRead": false,
    "createdAt": "2024-01-15T09:10:00.000Z",
    "sender": {
      "id": 1,
      "nickname": "测试用户",
      "avatar": null
    }
  },
  "success": true
}
```

---

### 2. 获取消息列表

**GET** `/messages/:consultationId`

#### 请求头
```
Authorization: Bearer <token>
```

#### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| consultationId | number | 问诊ID |

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| beforeId | number | 否 | 游标ID，用于分页 |
| pageSize | number | 否 | 每页数量，默认20 |

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "type": "TEXT",
      "content": "医生您好",
      "mediaUrl": null,
      "isRead": true,
      "createdAt": "2024-01-15T09:10:00.000Z",
      "sender": {
        "id": 1,
        "nickname": "测试用户",
        "avatar": null
      }
    },
    {
      "id": 2,
      "type": "TEXT",
      "content": "你好，请问有什么不适？",
      "mediaUrl": null,
      "isRead": true,
      "createdAt": "2024-01-15T09:11:00.000Z",
      "sender": {
        "id": 2,
        "nickname": "张医生",
        "avatar": null
      }
    }
  ],
  "success": true
}
```

---

### 3. 获取未读消息数

**GET** `/messages/unread`

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 5,
    "byConsultation": [
      {
        "consultationId": 1,
        "count": 3
      },
      {
        "consultationId": 2,
        "count": 2
      }
    ]
  },
  "success": true
}
```

---

### 4. 获取最近联系人列表

**GET** `/messages/recent`

#### 请求头
```
Authorization: Bearer <token>
```

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "consultationId": 1,
      "status": "IN_PROGRESS",
      "otherUser": {
        "id": 2,
        "nickname": "张医生",
        "avatar": null
      },
      "lastMessage": {
        "id": 10,
        "type": "TEXT",
        "content": "好的，注意休息",
        "sender": {
          "id": 2,
          "nickname": "张医生"
        },
        "isRead": false,
        "createdAt": "2024-01-15T09:30:00.000Z"
      },
      "updatedAt": "2024-01-15T09:30:00.000Z"
    }
  ],
  "success": true
}
```

---

## 用户中心模块

### 1. 获取用户统计

**GET** `/users/stats`

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "role": "USER",
    "totalConsultations": 10,
    "pendingConsultations": 1,
    "inProgressConsultations": 2,
    "completedConsultations": 6,
    "cancelledConsultations": 1,
    "unreadMessages": 3
  },
  "success": true
}
```

---

### 2. 获取问诊记录

**GET** `/users/records`

#### 请求头
```
Authorization: Bearer <token>
```

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选 |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "status": "COMPLETED",
        "symptoms": "胸闷气短...",
        "diagnosis": "植物神经功能紊乱",
        "prescription": "建议休息...",
        "startedAt": "2024-01-15T09:05:00.000Z",
        "endedAt": "2024-01-15T09:30:00.000Z",
        "createdAt": "2024-01-15T09:00:00.000Z",
        "lastMessage": {
          "id": 10,
          "content": "好的，注意休息",
          "createdAt": "2024-01-15T09:30:00.000Z"
        },
        "patient": {
          "id": 1,
          "nickname": "测试用户",
          "avatar": null
        },
        "doctor": {
          "id": 2,
          "nickname": "张医生",
          "avatar": null,
          "hospital": "北京协和医院",
          "department": "心内科",
          "title": "主任医师"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 10,
      "totalPages": 1
    }
  },
  "success": true
}
```

---

### 3. 获取医生资质状态

**GET** `/users/doctor-status`

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "hasProfile": true,
    "canApply": false,
    "profile": {
      "id": 1,
      "realName": "张伟",
      "verifyStatus": "APPROVED",
      "category": {
        "id": 1,
        "name": "内科"
      }
    }
  },
  "success": true
}
```

---

### 4. 获取系统通知

**GET** `/users/notifications`

#### 请求头
```
Authorization: Bearer <token>
```

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

---

## WebSocket 实时通信

### 连接方式
```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### 事件列表

#### 客户端发送事件

| 事件名 | 说明 | 参数 |
|--------|------|------|
| `join_consultation` | 加入问诊房间 | `{ consultationId }` |
| `leave_consultation` | 离开问诊房间 | `{ consultationId }` |
| `send_message` | 发送消息 | `{ consultationId, content, type }` |
| `typing` | 输入状态 | `{ consultationId, isTyping }` |
| `mark_read` | 标记已读 | `{ consultationId }` |

#### 服务端推送事件

| 事件名 | 说明 | 数据 |
|--------|------|------|
| `joined` | 成功加入房间 | `{ consultationId }` |
| `left` | 成功离开房间 | `{ consultationId }` |
| `new_message` | 新消息 | 消息对象 |
| `user_typing` | 对方正在输入 | `{ userId, isTyping }` |
| `messages_read` | 消息已读 | `{ by }` |
| `new_notification` | 新通知 | 通知对象 |
| `error` | 错误 | `{ message }` |

### 使用示例

```javascript
// 连接Socket
const socket = io('ws://localhost:3001', {
  auth: { token: userToken }
});

// 加入问诊房间
socket.emit('join_consultation', 1);

// 监听新消息
socket.on('new_message', (message) => {
  console.log('收到新消息:', message);
});

// 发送消息
socket.emit('send_message', {
  consultationId: 1,
  content: '医生您好',
  type: 'TEXT'
});

// 监听输入状态
socket.on('user_typing', (data) => {
  console.log(data.isTyping ? '对方正在输入...' : '');
});

// 发送输入状态
socket.emit('typing', {
  consultationId: 1,
  isTyping: true
});

// 标记已读
socket.emit('mark_read', { consultationId: 1 });
```

---

## 业务流程图

### 用户问诊流程
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  注册   │ -> │  登录   │ -> │ 选医生  │ -> │ 发问诊  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                  │
                                                  v
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  评价   │ <- │  结束   │ <- │  IM对话 │ <- │ 医生接诊│
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### 医生认证流程
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  注册   │ -> │  登录   │ -> │提交资质 │ -> │等待审核 │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                  │
                                                  v
┌─────────┐    ┌─────────┐    ┌─────────┐
│开始接诊 │ <- │切换角色 │ <- │审核通过 │
└─────────┘    └─────────┘    └─────────┘
```

---

## 错误处理

### 常见错误码

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 400 | 参数错误 | 检查请求参数 |
| 401 | 未授权 | 重新登录获取token |
| 403 | 无权访问 | 检查用户权限 |
| 404 | 资源不存在 | 检查资源ID |
| 409 | 资源冲突 | 检查重复操作 |
| 500 | 服务器错误 | 联系管理员 |

### 错误响应示例
```json
{
  "code": 400,
  "message": "手机号格式不正确",
  "data": null,
  "success": false
}
```

---

## 文件上传

### 支持的文件类型

| 字段名 | 类型 | 大小限制 | 说明 |
|--------|------|----------|------|
| avatar | image | 10MB | 用户头像 |
| licenseImage | image | 10MB | 医生资质证明 |
| media | image/audio | 10MB | 消息媒体文件 |

### 上传示例
```bash
curl -X POST http://localhost:3001/api/doctors/apply \
  -H "Authorization: Bearer <token>" \
  -F "realName=张伟" \
  -F "idCard=110101199001011234" \
  -F "licenseNo=LIC123456" \
  -F "hospital=北京协和医院" \
  -F "licenseImage=@/path/to/image.jpg"
```

---

## 项目启动

### 安装依赖
```bash
npm install
```

### 初始化数据库
```bash
npx prisma migrate dev --name init
npm run db:seed
```

### 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 访问服务
- HTTP API: http://localhost:3001
- WebSocket: ws://localhost:3001
