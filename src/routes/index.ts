import { Hono } from 'hono'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'

const routes = new Hono()

// Mount routes dengan prefix
routes.route('/auth', authRoutes)
routes.route('/users', userRoutes)

export default routes
