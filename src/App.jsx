import Header from './components/Header'
import Hero from './components/Hero'
import Services from './components/Services'
import HowItWorks from './components/HowItWorks'
import Gallery from './components/Gallery'
import GiftTeaser from './components/GiftTeaser'
import Testimonials from './components/Testimonials'
import Faq from './components/Faq'
import ServiceAreas from './components/ServiceAreas'
import Estimate from './components/Estimate'
import Footer from './components/Footer'
import MobileCta from './components/MobileCta'
import SkipLink from './components/SkipLink'
import Memorial from './components/Memorial'

export default function App() {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Services />
        <HowItWorks />
        <Gallery />
        <GiftTeaser />
        <Testimonials />
        <ServiceAreas />
        <Faq />
        <Estimate />
        <Memorial />
      </main>
      <Footer />
      <MobileCta />
    </>
  )
}
