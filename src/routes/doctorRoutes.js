const express = require('express')
const {
  getDoctors,
  getDoctorDetail,
  submitDoctorProfile,
  getMyDoctorProfile,
  reviewDoctor,
  getPendingDoctors
} = require('../controllers/doctorController')
const { authMiddleware, adminAuthMiddleware } = require('../middleware/auth')
const upload = require('../middleware/upload')

const router = express.Router()

router.get('/', getDoctors)
router.get('/categories', require('../controllers/categoryController').getAllCategories)
router.get('/:id', getDoctorDetail)

router.get('/profile/me', authMiddleware, getMyDoctorProfile)
router.post('/profile', authMiddleware, upload.single('certificate'), submitDoctorProfile)

router.get('/admin/pending', authMiddleware, adminAuthMiddleware, getPendingDoctors)
router.put('/:id/review', authMiddleware, adminAuthMiddleware, reviewDoctor)

module.exports = router
