<template>
  <div class="landing-page">
    <CosmicBackground />
    <LandingNavbar />
    <HeroSection />
    <FeaturesSection />
    <StatsSection />
    <ShowcaseSection />
    <RoadmapSection />
    <TestimonialsSection />
    <PricingSection />
    <CTASection />
    <FooterSection />
  </div>
</template>

<script setup lang="ts">
import CosmicBackground from '../../components/CosmicBackground.vue'
import LandingNavbar from './LandingNavbar.vue'
import HeroSection from './sections/HeroSection.vue'
import FeaturesSection from './sections/FeaturesSection.vue'
import StatsSection from './sections/StatsSection.vue'
import ShowcaseSection from './sections/ShowcaseSection.vue'
import RoadmapSection from './sections/RoadmapSection.vue'
import TestimonialsSection from './sections/TestimonialsSection.vue'
import PricingSection from './sections/PricingSection.vue'
import CTASection from './sections/CTASection.vue'
import FooterSection from './sections/FooterSection.vue'
</script>

<style scoped>
.landing-page {
  width: 100%;
  min-height: 100vh;
  background-color: transparent;
  position: relative;
  z-index: 1; /* 确保所有内容在CosmicBackground之上 */
}
</style>
