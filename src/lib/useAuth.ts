// Thin re-export — AuthUser and useAuth remain importable from this path
// so existing consumers and test mocks are unchanged.
export { useAuthContext as useAuth, type AuthUser } from './AuthContext'
