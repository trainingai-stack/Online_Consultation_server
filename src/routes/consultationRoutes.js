const express = require('express')
const {
  createConsultation,
  getConsultations,
  getConsultationDetail,
  updateConsultationStatus,
  sendMessage,
  getMessages
} = require('../controllers/consultationController')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

router.post('/', createConsultation)
router.get('/', getConsultations)
router.get('/:id', getConsultationDetail)
router.put('/:id/status', updateConsultationStatus)

router.post('/:consultationId/messages', sendMessage)
router.get('/:consultationId/messages', getMessages)

module.exports = router
