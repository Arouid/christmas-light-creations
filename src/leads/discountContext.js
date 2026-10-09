import { createContext, useContext } from 'react'
import { DEFAULT_SCHEDULE } from '../lib/discounts'

// The early-install discount schedule from staff Settings (default until set).
export const DiscountSchedule = createContext(DEFAULT_SCHEDULE)
export const useDiscountSchedule = () => useContext(DiscountSchedule)
