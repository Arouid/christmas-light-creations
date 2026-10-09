import { createContext, useContext } from 'react'

// Routes + "add these customers to a route", so any customer card or list can
// send stops to a route without passing props through every screen.
export const RoutesContext = createContext(null)
export const useRoutesContext = () => useContext(RoutesContext)
