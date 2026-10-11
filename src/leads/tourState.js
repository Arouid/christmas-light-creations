// Has this phone/computer seen the first-login tour? (localStorage)
export const TOUR_KEY = 'clcTourDone'
export const tourDone = () => { try { return localStorage.getItem(TOUR_KEY) === '1' } catch { return true } }
export const markTourDone = () => { try { localStorage.setItem(TOUR_KEY, '1') } catch { /* private mode: it'll show again, fine */ } }
