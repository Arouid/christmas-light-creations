import Header from './components/Header'
import Hero from './components/Hero'
import Services from './components/Services'
import HowItWorks from './components/HowItWorks'
import Gallery from './components/Gallery'
import Testimonials from './components/Testimonials'
import Faq from './components/Faq'
import ServiceAreas from './components/ServiceAreas'
import Estimate from './components/Estimate'
import Footer from './components/Footer'
import MobileCta from './components/MobileCta'
import Memorial from './components/Memorial'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Gallery />
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
