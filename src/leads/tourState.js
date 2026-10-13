// Has this phone/computer seen the first-login tour? (localStorage)
export const TOUR_KEY = 'clcTourDone'
export const tourDone = () => { try { return localStorage.getItem(TOUR_KEY) === '1' } catch { return true } }
export const markTourDone = () => { try { localStorage.setItem(TOUR_KEY, '1') } catch { /* private mode: it'll show again, fine */ } }

// Has this phone/computer opened the current "What's new" (by its date)?
export const NEWS_KEY = 'clcWhatsNewSeen'
export const whatsNewSeen = (date) => { try { return localStorage.getItem(NEWS_KEY) === date } catch { return true } }
export const markWhatsNewSeen = (date) => { try { localStorage.setItem(NEWS_KEY, date) } catch { /* private mode: fine */ } }
