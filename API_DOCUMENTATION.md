# P2P线上问诊系统 API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3002/api`
- **认证方式**: JWT Bearer Token
- **Content-Type**: `application/json`

## 目录

1. [健康检查](#1-健康检查)
2. [认证模块](#2-认证模块)
3. [医生模块](#3-医生模块)
4. [问诊模块](#4-问诊模块)
5. [消息模块](#5-消息模块)
6. [用户模块](#6-用户模块)

---

## 1. 健康检查

### 1.1 健康检查接口

**GET** `/health`

检查服务是否正常运行。

**响应示例**:
```json
{
  "success": true,
  "message": "服务运行中",
  "timestamp": "2026-04-14T08:00:00.000Z"
}
```

---

## 2. 认证模块

### 2.1 用户注册

**POST** `/auth/register`

注册新用户账号。

**请求体**:
```json
{
  "phone": "13800138001",
  "password": "123456",
  "nickname": "用户昵称"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号码，唯一 |
| password | string | 是 | 密码，最少6位 |
| nickname | string | 否 | 用户昵称 |

**响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "phone": "13800138001",
      "nickname": "用户昵称",
      "avatar": null,
      "role": "USER"
    }
  }
}
```

### 2.2 用户登录

**POST** `/auth/login`

用户登录获取Token。

**请求体**:
```json
{
  "phone": "13800138001",
  "password": "123456"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "phone": "13800138001",
      "nickname": "用户昵称",
      "avatar": null,
      "role": "USER"
    }
  }
}
```

### 2.3 获取用户信息

**GET** `/auth/profile`

获取当前登录用户的详细信息。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "13800138001",
    "nickname": "用户昵称",
    "avatar": null,
    "role": "USER",
    "doctorProfile": null,
    "qualifications": []
  }
}
```

### 2.4 更新用户信息

**PUT** `/auth/profile`

更新当前用户的基本信息。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "nickname": "新昵称",
  "avatar": "头像URL"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    "id": "uuid",
    "phone": "13800138001",
    "nickname": "新昵称",
    "avatar": "头像URL",
    "role": "USER"
  }
}
```

### 2.5 申请成为医生

**POST** `/auth/become-doctor`

将当前用户升级为医生角色。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "categoryId": "医生分类ID",
  "title": "主治医师",
  "hospital": "某某医院",
  "department": "内科",
  "introduction": "医生简介",
  "specialty": "专业特长",
  "consultationFee": 50
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| categoryId | string | 是 | 医生分类ID |
| title | string | 否 | 职称 |
| hospital | string | 否 | 所在医院 |
| department | string | 否 | 科室 |
| introduction | string | 否 | 个人简介 |
| specialty | string | 否 | 专业特长 |
| consultationFee | number | 否 | 问诊费用 |

**响应示例**:
```json
{
  "success": true,
  "message": "申请成为医生成功",
  "data": {
    "doctorProfile": {
      "id": "uuid",
      "userId": "uuid",
      "categoryId": "uuid",
      "title": "主治医师",
      "hospital": "某某医院",
      "department": "内科",
      "introduction": "医生简介",
      "specialty": "专业特长",
      "consultationFee": 50,
      "rating": 5,
      "consultationCount": 0,
      "isVerified": true,
      "isOnline": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2.6 更新医生资料

**PUT** `/auth/doctor-profile`

更新医生的详细信息。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**: 同申请成为医生接口

### 2.7 设置在线状态

**PUT** `/auth/online-status`

设置医生的在线状态。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "isOnline": true
}
```

---

## 3. 医生模块

### 3.1 获取医生分类列表

**GET** `/doctors/categories`

获取所有医生分类。

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "内科",
      "description": "包括心血管内科、呼吸内科、消化内科等",
      "icon": "internal",
      "sortOrder": 1,
      "doctorCount": 5
    }
  ]
}
```

### 3.2 获取医生列表

**GET** `/doctors/list`

获取已认证的医生列表。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| categoryId | string | 否 | 按分类筛选 |
| keyword | string | 否 | 搜索关键词（姓名、医院、科室） |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "uuid",
        "userId": "uuid",
        "title": "主治医师",
        "hospital": "某某医院",
        "department": "内科",
        "introduction": "医生简介",
        "specialty": "专业特长",
        "consultationFee": 50,
        "rating": 5,
        "consultationCount": 10,
        "isVerified": true,
        "isOnline": true,
        "user": {
          "id": "uuid",
          "nickname": "张医生",
          "avatar": "头像URL"
        },
        "category": {
          "id": "uuid",
          "name": "内科"
        }
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

### 3.3 获取医生详情

**GET** `/doctors/:id`

获取指定医生的详细信息。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 医生用户ID |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "主治医师",
    "hospital": "某某医院",
    "department": "内科",
    "introduction": "医生简介",
    "specialty": "专业特长",
    "consultationFee": 50,
    "rating": 5,
    "consultationCount": 10,
    "isVerified": true,
    "isOnline": true,
    "user": {
      "id": "uuid",
      "nickname": "张医生",
      "avatar": "头像URL"
    },
    "category": {
      "id": "uuid",
      "name": "内科",
      "description": "分类描述"
    }
  }
}
```

### 3.4 上传资质证书

**POST** `/doctors/qualifications/upload`

上传医生资质证书图片。

**请求头**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**表单字段**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 证书图片文件 |
| type | string | 是 | 证书类型（如：执业医师证、职称证等） |
| certificateNo | string | 否 | 证书编号 |

**响应示例**:
```json
{
  "success": true,
  "message": "上传成功",
  "data": {
    "id": "uuid",
    "type": "执业医师证",
    "certificateNo": "123456",
    "certificateImage": "/uploads/qualifications/xxx.jpg",
    "status": "PENDING"
  }
}
```

### 3.5 获取资质列表

**GET** `/doctors/qualifications/list`

获取当前医生的资质证书列表。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "执业医师证",
      "certificateNo": "123456",
      "certificateImage": "/uploads/qualifications/xxx.jpg",
      "status": "APPROVED",
      "reviewNote": null,
      "reviewedAt": "2026-04-14T08:00:00.000Z"
    }
  ]
}
```

---

## 4. 问诊模块

### 4.1 创建问诊

**POST** `/consultations/create`

用户向医生发起问诊。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "doctorId": "医生用户ID",
  "chiefComplaint": "头痛、发热两天"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| doctorId | string | 是 | 医生用户ID |
| chiefComplaint | string | 否 | 主诉症状 |

**响应示例**:
```json
{
  "success": true,
  "message": "问诊创建成功",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "doctorId": "uuid",
    "status": "PENDING",
    "chiefComplaint": "头痛、发热两天",
    "createdAt": "2026-04-14T08:00:00.000Z",
    "user": {
      "id": "uuid",
      "nickname": "患者",
      "avatar": null
    },
    "doctor": {
      "id": "uuid",
      "nickname": "张医生",
      "avatar": null
    }
  }
}
```

### 4.2 获取问诊列表

**GET** `/consultations`

获取当前用户的问诊列表。

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选：PENDING/ACTIVE/COMPLETED/CANCELLED |
| role | string | 否 | 角色筛选：doctor（作为医生）/ 不传（作为用户） |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "uuid",
        "status": "COMPLETED",
        "chiefComplaint": "头痛、发热两天",
        "diagnosis": "感冒引起的头痛",
        "rating": 5,
        "createdAt": "2026-04-14T08:00:00.000Z",
        "user": {
          "id": "uuid",
          "nickname": "患者"
        },
        "doctor": {
          "id": "uuid",
          "nickname": "张医生",
          "doctorProfile": {
            "title": "主治医师",
            "hospital": "某某医院"
          }
        },
        "messageCount": 10
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 4.3 获取问诊详情

**GET** `/consultations/:id`

获取指定问诊的详细信息，包括消息记录。

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 问诊ID |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    "chiefComplaint": "头痛、发热两天",
    "diagnosis": null,
    "prescription": null,
    "startedAt": "2026-04-14T08:00:00.000Z",
    "user": {
      "id": "uuid",
      "nickname": "患者",
      "avatar": null
    },
    "doctor": {
      "id": "uuid",
      "nickname": "张医生",
      "avatar": null,
      "doctorProfile": {
        "title": "主治医师",
        "hospital": "某某医院"
      }
    },
    "messages": [
      {
        "id": "uuid",
        "content": "医生您好",
        "type": "text",
        "isRead": true,
        "createdAt": "2026-04-14T08:00:00.000Z",
        "sender": {
          "id": "uuid",
          "nickname": "患者"
        }
      }
    ]
  }
}
```

### 4.4 接受问诊

**POST** `/consultations/:id/accept`

医生接受问诊请求。

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 问诊ID |

**响应示例**:
```json
{
  "success": true,
  "message": "已接受问诊",
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    "startedAt": "2026-04-14T08:00:00.000Z"
  }
}
```

### 4.5 完成问诊

**POST** `/consultations/:id/complete`

医生完成问诊并填写诊断。

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 问诊ID |

**请求体**:
```json
{
  "diagnosis": "感冒引起的头痛",
  "prescription": "多休息，多喝水，可服用感冒药"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "问诊已完成",
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "diagnosis": "感冒引起的头痛",
    "prescription": "多休息，多喝水，可服用感冒药",
    "endedAt": "2026-04-14T08:30:00.000Z"
  }
}
```

### 4.6 取消问诊

**POST** `/consultations/:id/cancel`

用户或医生取消问诊。

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 问诊ID |

**响应示例**:
```json
{
  "success": true,
  "message": "问诊已取消",
  "data": {
    "id": "uuid",
    "status": "CANCELLED"
  }
}
```

### 4.7 评价问诊

**POST** `/consultations/:id/rate`

用户对已完成的问诊进行评价。

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 问诊ID |

**请求体**:
```json
{
  "rating": 5,
  "review": "医生很专业，服务很好"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| rating | number | 是 | 评分，1-5分 |
| review | string | 否 | 评价内容 |

**响应示例**:
```json
{
  "success": true,
  "message": "评价成功",
  "data": {
    "id": "uuid",
    "rating": 5,
    "review": "医生很专业，服务很好"
  }
}
```

### 4.8 获取待处理问诊

**GET** `/consultations/pending/list`

医生获取待处理的问诊列表。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "PENDING",
      "chiefComplaint": "头痛、发热两天",
      "createdAt": "2026-04-14T08:00:00.000Z",
      "user": {
        "id": "uuid",
        "nickname": "患者",
        "avatar": null
      }
    }
  ]
}
```

---

## 5. 消息模块

### 5.1 发送消息

**POST** `/messages/send`

在问诊中发送消息。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "consultationId": "问诊ID",
  "content": "医生您好，我头痛两天了",
  "type": "text"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| consultationId | string | 是 | 问诊ID |
| content | string | 是 | 消息内容 |
| type | string | 否 | 消息类型，默认text |

**响应示例**:
```json
{
  "success": true,
  "message": "发送成功",
  "data": {
    "id": "uuid",
    "consultationId": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "content": "医生您好，我头痛两天了",
    "type": "text",
    "isRead": false,
    "createdAt": "2026-04-14T08:00:00.000Z",
    "sender": {
      "id": "uuid",
      "nickname": "患者",
      "avatar": null
    }
  }
}
```

### 5.2 获取消息列表

**GET** `/messages/:consultationId`

获取问诊的消息记录。

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| consultationId | string | 问诊ID |

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| beforeId | string | 否 | 获取此ID之前的消息（用于分页） |
| limit | number | 否 | 数量限制，默认50 |

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "医生您好",
      "type": "text",
      "isRead": true,
      "createdAt": "2026-04-14T08:00:00.000Z",
      "sender": {
        "id": "uuid",
        "nickname": "患者",
        "avatar": null
      }
    }
  ]
}
```

### 5.3 标记消息已读

**POST** `/messages/read/:consultationId`

将问诊中的消息标记为已读。

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| consultationId | string | 问诊ID |

**响应示例**:
```json
{
  "success": true,
  "message": "已标记为已读"
}
```

### 5.4 获取未读消息数

**GET** `/messages/unread/count`

获取当前用户的未读消息数量。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## 6. 用户模块

### 6.1 获取统计数据

**GET** `/user/stats`

获取用户或医生的统计数据。

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例（用户）**:
```json
{
  "success": true,
  "data": {
    "user": {
      "totalConsultations": 10,
      "completedConsultations": 8,
      "activeConsultations": 2
    }
  }
}
```

**响应示例（医生）**:
```json
{
  "success": true,
  "data": {
    "doctor": {
      "totalConsultations": 50,
      "completedConsultations": 45,
      "activeConsultations": 3,
      "pendingConsultations": 2,
      "rating": 4.8,
      "consultationCount": 45
    },
    "user": {
      "totalConsultations": 0,
      "completedConsultations": 0,
      "activeConsultations": 0
    }
  }
}
```

### 6.2 获取问诊记录

**GET** `/user/records`

获取用户或医生的问诊记录。

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 记录类型：doctor（作为医生）/ 不传（作为用户） |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "uuid",
        "status": "COMPLETED",
        "chiefComplaint": "头痛、发热两天",
        "diagnosis": "感冒引起的头痛",
        "prescription": "多休息，多喝水",
        "rating": 5,
        "review": "医生很专业",
        "createdAt": "2026-04-14T08:00:00.000Z",
        "user": {
          "id": "uuid",
          "nickname": "患者"
        },
        "doctor": {
          "id": "uuid",
          "nickname": "张医生",
          "doctorProfile": {
            "title": "主治医师",
            "hospital": "某某医院"
          }
        }
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

---

## 错误响应

所有接口在发生错误时返回以下格式：

```json
{
  "success": false,
  "message": "错误信息描述"
}
```

常见HTTP状态码：
- `400` - 请求参数错误
- `401` - 未登录或Token无效
- `403` - 无权限访问
- `404` - 资源不存在
- `500` - 服务器内部错误

---

## WebSocket 实时通信

服务支持WebSocket实时消息推送，连接地址：`ws://localhost:3002`

### 连接认证

连接时需要携带Token：
```javascript
const socket = io('http://localhost:3002', {
  auth: {
    token: 'Bearer <your_token>'
  }
});
```

### 事件列表

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `new_message` | 服务端->客户端 | 收到新消息 |
| `consultation_update` | 服务端->客户端 | 问诊状态更新 |

### 消息格式

**新消息事件**:
```json
{
  "id": "uuid",
  "consultationId": "uuid",
  "content": "消息内容",
  "type": "text",
  "sender": {
    "id": "uuid",
    "nickname": "发送者昵称"
  },
  "createdAt": "2026-04-14T08:00:00.000Z"
}
```

---

## 数据模型

### User 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 用户ID |
| phone | string | 手机号 |
| password | string | 密码（加密） |
| nickname | string | 昵称 |
| avatar | string | 头像URL |
| role | enum | 角色：USER/DOCTOR |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

### DoctorProfile 医生资料表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | ID |
| userId | string | 用户ID |
| categoryId | string | 分类ID |
| title | string | 职称 |
| hospital | string | 医院 |
| department | string | 科室 |
| introduction | string | 简介 |
| specialty | string | 专长 |
| consultationFee | float | 问诊费 |
| rating | float | 评分 |
| consultationCount | int | 问诊数 |
| isVerified | boolean | 是否认证 |
| isOnline | boolean | 是否在线 |

### Consultation 问诊表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | ID |
| userId | string | 用户ID |
| doctorId | string | 医生ID |
| status | enum | 状态：PENDING/ACTIVE/COMPLETED/CANCELLED |
| chiefComplaint | string | 主诉 |
| diagnosis | string | 诊断 |
| prescription | string | 处方 |
| rating | int | 评分 |
| review | string | 评价 |
| startedAt | datetime | 开始时间 |
| endedAt | datetime | 结束时间 |

### Message 消息表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | ID |
| consultationId | string | 问诊ID |
| senderId | string | 发送者ID |
| receiverId | string | 接收者ID |
| content | string | 内容 |
| type | string | 类型 |
| isRead | boolean | 是否已读 |
| createdAt | datetime | 创建时间 |

---

## 启动说明

1. 安装依赖：
```bash
npm install
```

2. 初始化数据库：
```bash
npx prisma migrate dev
npm run seed
```

3. 启动服务：
```bash
npm start
```

服务将在 `http://localhost:3002` 启动。
