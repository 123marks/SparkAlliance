<template>
  <div class="landing-page">
    <LandingNavbar />
    <HeroSection />
    <FeaturesSection />
    <ShowcaseSection />
    <TestimonialsSection />
    <CTASection />
    <FooterSection />
  </div>
</template>

<script setup lang="ts">
import LandingNavbar from './LandingNavbar.vue'
import HeroSection from './sections/HeroSection.vue'
import FeaturesSection from './sections/FeaturesSection.vue'
import ShowcaseSection from './sections/ShowcaseSection.vue'
import TestimonialsSection from './sections/TestimonialsSection.vue'
import CTASection from './sections/CTASection.vue'
import FooterSection from './sections/FooterSection.vue'
</script>

<style scoped>
.landing-page {
  width: 100%;
  min-height: 100vh;
  background-color: var(--color-bg-primary);
  position: relative;
}
</style>
