import { createContext, useContext } from 'react'
import { STOCK_TEMPLATES } from '../lib/emailTemplates'

// Email templates (stock + staff edits) from settings/app.emailTemplates.
export const EmailTemplates = createContext(STOCK_TEMPLATES)
export const useEmailTemplates = () => useContext(EmailTemplates)
