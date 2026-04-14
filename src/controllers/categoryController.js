const { all, run } = require('../utils/db')

const getAllCategories = (req, res, next) => {
  try {
    const categories = all(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM doctorProfiles dp WHERE dp.categoryId = c.id AND dp.status = 'APPROVED') as doctorCount
      FROM categories c 
      ORDER BY c.sortOrder ASC
    `)

    res.json({
      success: true,
      data: { categories }
    })
  } catch (error) {
    next(error)
  }
}

const createCategory = (req, res, next) => {
  try {
    const { name, description, icon, sortOrder } = req.body

    const result = run(
      'INSERT INTO categories (name, description, icon, sortOrder) VALUES (?, ?, ?, ?)',
      [name, description, icon, sortOrder || 0]
    )

    const category = {
      id: result.lastInsertRowid,
      name,
      description,
      icon,
      sortOrder: sortOrder || 0
    }

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: { category }
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllCategories,
  createCategory
}
