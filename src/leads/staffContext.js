import { createContext, useContext } from 'react'

// Signed-in staff user + shared settings for components deep in the app
// (e.g. the Designs panel on customer and lead cards).
export const StaffContext = createContext({ user: null, settings: {} })
export const useStaff = () => useContext(StaffContext)
