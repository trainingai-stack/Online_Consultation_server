# P2P 在线问诊 API 文档

## 基础信息

- 基础URL: `http://localhost:3001/api`
- 数据格式: JSON
- 认证方式: Bearer Token (JWT)

---

## 1. 认证接口

### 1.1 用户注册

**接口地址:** `POST /auth/register`

**请求参数:**
```json
{
  "username": "testuser",
  "email": "user@example.com",
  "password": "123456",
  "role": "USER"  // 可选: USER / DOCTOR
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "user@example.com",
      "role": "USER",
      "avatar": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.2 用户登录

**接口地址:** `POST /auth/login`

**请求参数:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "user@example.com",
      "role": "USER",
      "avatar": null,
      "doctorProfile": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.3 获取当前用户信息

**接口地址:** `GET /auth/me`

**请求头:** `Authorization: Bearer {token}`

**响应示例:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "user@example.com",
      "role": "USER",
      "avatar": null,
      "phone": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "doctorProfile": null
    }
  }
}
```

---

### 1.4 更新用户资料

**接口地址:** `PUT /auth/profile`

**请求头:** `Authorization: Bearer {token}`

**请求参数:**
```json
{
  "username": "newname",
  "avatar": "https://example.com/avatar.jpg",
  "phone": "13800138000"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    "user": {
      "id": 1,
      "username": "newname",
      "email": "user@example.com",
      "role": "USER",
      "avatar": "https://example.com/avatar.jpg",
      "phone": "13800138000"
    }
  }
}
```

---

## 2. 医生分类接口

### 2.1 获取所有分类

**接口地址:** `GET /doctors/categories`

**响应示例:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "内科",
        "description": "内科常见病诊治",
        "icon": "internal",
        "sortOrder": 1,
        "doctorCount": 0
      },
      {
        "id": 2,
        "name": "外科",
        "description": "外科疾病诊疗",
        "icon": "surgical",
        "sortOrder": 2,
        "doctorCount": 0
      }
    ]
  }
}
```

---

## 3. 医生接口

### 3.1 获取医生列表

**接口地址:** `GET /doctors`

**查询参数:**
- `categoryId`: 分类ID (可选)
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 10

**响应示例:**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": 1,
        "userId": 2,
        "categoryId": 1,
        "realName": "张医生",
        "title": "主任医师",
        "hospital": "北京协和医院",
        "expertise": "心血管疾病",
        "status": "APPROVED",
        "rating": 5.0,
        "consultationCount": 0,
        "username": "doctor1",
        "avatar": null,
        "categoryName": "内科"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 3.2 获取医生详情

**接口地址:** `GET /doctors/:id`

**响应示例:**
```json
{
  "success": true,
  "data": {
    "doctor": {
      "id": 1,
      "userId": 2,
      "categoryId": 1,
      "realName": "张医生",
      "title": "主任医师",
      "hospital": "北京协和医院",
      "expertise": "心血管疾病",
      "status": "APPROVED",
      "rating": 5.0,
      "username": "doctor1",
      "avatar": null,
      "email": "doctor@example.com",
      "categoryName": "内科"
    }
  }
}
```

---

### 3.3 提交医生资质

**接口地址:** `POST /doctors/profile`

**请求头:** `Authorization: Bearer {token}`
**Content-Type:** `multipart/form-data`

**请求参数:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| categoryId | number | 是 | 分类ID |
| realName | string | 是 | 真实姓名 |
| title | string | 是 | 职称 |
| hospital | string | 是 | 医院 |
| expertise | string | 是 | 专长 |
| description | string | 否 | 简介 |
| certificate | file | 是 | 资质证明文件 (图片/PDF) |

**响应示例:**
```json
{
  "success": true,
  "message": "资质已提交，等待审核",
  "data": {
    "doctorProfile": {
      "id": 1,
      "userId": 2,
      "categoryId": 1,
      "realName": "张医生",
      "title": "主任医师",
      "hospital": "北京协和医院",
      "expertise": "心血管疾病",
      "certificate": "/uploads/certificate-123456789.pdf",
      "status": "PENDING"
    }
  }
}
```

---

### 3.4 获取我的医生资料

**接口地址:** `GET /doctors/profile/me`

**请求头:** `Authorization: Bearer {token}`

**响应示例:**
```json
{
  "success": true,
  "data": {
    "doctorProfile": {
      "id": 1,
      "userId": 2,
      "categoryId": 1,
      "realName": "张医生",
      "title": "主任医师",
      "hospital": "北京协和医院",
      "expertise": "心血管疾病",
      "status": "PENDING",
      "categoryName": "内科",
      "username": "doctor1",
      "avatar": null,
      "email": "doctor@example.com"
    }
  }
}
```

---

### 3.5 审核医生资质 (管理员)

**接口地址:** `PUT /doctors/:id/review`

**请求头:** `Authorization: Bearer {admin-token}`

**请求参数:**
```json
{
  "status": "APPROVED"  // APPROVED / REJECTED
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "医生资质已通过",
  "data": {
    "doctorProfile": {
      "id": 1,
      "status": "APPROVED"
    }
  }
}
```

---

### 3.6 获取待审核医生列表 (管理员)

**接口地址:** `GET /doctors/admin/pending`

**请求头:** `Authorization: Bearer {admin-token}`

**响应示例:**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": 1,
        "realName": "张医生",
        "status": "PENDING",
        "username": "doctor1",
        "email": "doctor@example.com",
        "categoryName": "内科"
      }
    ]
  }
}
```

---

## 4. 问诊接口

### 4.1 发起问诊

**接口地址:** `POST /consultations`

**请求头:** `Authorization: Bearer {token}`

**请求参数:**
```json
{
  "doctorId": 1,
  "title": "头痛咨询",
  "description": "最近经常头痛，想咨询一下原因"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "问诊已发起，等待医生接诊",
  "data": {
    "consultation": {
      "id": 1,
      "userId": 1,
      "doctorId": 1,
      "title": "头痛咨询",
      "description": "最近经常头痛，想咨询一下原因",
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "doctorName": "张医生",
      "doctorAvatar": null,
      "userName": "testuser",
      "userAvatar": null
    }
  }
}
```

---

### 4.2 获取我的问诊列表

**接口地址:** `GET /consultations`

**请求头:** `Authorization: Bearer {token}`

**查询参数:**
- `status`: 状态 (PENDING/ACTIVE/COMPLETED/CANCELLED)，可选
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 10

**响应示例:**
```json
{
  "success": true,
  "data": {
    "consultations": [
      {
        "id": 1,
        "userId": 1,
        "doctorId": 1,
        "title": "头痛咨询",
        "status": "PENDING",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "doctorName": "张医生",
        "doctorAvatar": null,
        "userName": "testuser",
        "userAvatar": null,
        "lastMessage": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 4.3 获取问诊详情

**接口地址:** `GET /consultations/:id`

**请求头:** `Authorization: Bearer {token}`

**响应示例:**
```json
{
  "success": true,
  "data": {
    "consultation": {
      "id": 1,
      "userId": 1,
      "doctorId": 1,
      "title": "头痛咨询",
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "doctorName": "张医生",
      "doctorAvatar": null,
      "userName": "testuser",
      "userAvatar": null,
      "messages": []
    }
  }
}
```

---

### 4.4 更新问诊状态

**接口地址:** `PUT /consultations/:id/status`

**请求头:** `Authorization: Bearer {token}`

**请求参数:**
```json
{
  "status": "ACTIVE"  // ACTIVE / COMPLETED / CANCELLED
}
```

**说明:**
- 医生可以将 PENDING 状态改为 ACTIVE (接诊)
- 双方都可以将问诊改为 COMPLETED (结束) 或 CANCELLED (取消)

**响应示例:**
```json
{
  "success": true,
  "message": "问诊状态已更新",
  "data": {
    "consultation": {
      "id": 1,
      "status": "ACTIVE"
    }
  }
}
```

---

## 5. 消息接口

### 5.1 发送消息

**接口地址:** `POST /consultations/:consultationId/messages`

**请求头:** `Authorization: Bearer {token}`

**请求参数:**
```json
{
  "content": "医生您好，我最近经常头痛",
  "type": "text"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "消息发送成功",
  "data": {
    "message": {
      "id": 1,
      "consultationId": 1,
      "senderId": 1,
      "content": "医生您好，我最近经常头痛",
      "type": "text",
      "isRead": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "senderName": "testuser",
      "senderAvatar": null,
      "senderRole": "USER"
    }
  }
}
```

---

### 5.2 获取消息列表

**接口地址:** `GET /consultations/:consultationId/messages`

**请求头:** `Authorization: Bearer {token}`

**查询参数:**
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 50

**响应示例:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "consultationId": 1,
        "senderId": 1,
        "content": "医生您好，我最近经常头痛",
        "type": "text",
        "isRead": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "senderName": "testuser",
        "senderAvatar": null,
        "senderRole": "USER"
      },
      {
        "id": 2,
        "consultationId": 1,
        "senderId": 2,
        "content": "您好，请详细描述一下头痛的部位和持续时间",
        "type": "text",
        "isRead": 1,
        "createdAt": "2024-01-01T00:01:00.000Z",
        "senderName": "张医生",
        "senderAvatar": null,
        "senderRole": "DOCTOR"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

---

## 默认账号

**管理员账号:**
- 邮箱: `admin@example.com`
- 密码: `admin123`

---

## 状态说明

### 用户角色 (role)
- `USER`: 普通用户
- `DOCTOR`: 医生
- `ADMIN`: 管理员

### 医生审核状态 (status)
- `PENDING`: 待审核
- `APPROVED`: 已通过
- `REJECTED`: 已拒绝

### 问诊状态 (status)
- `PENDING`: 待接诊
- `ACTIVE`: 问诊中
- `COMPLETED`: 已完成
- `CANCELLED`: 已取消

---

## 错误响应格式

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

---

## 项目启动说明

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 服务地址: http://localhost:3001
```
