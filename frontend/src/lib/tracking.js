// Tracking utilities for Meta Pixel and Google Ads

/**
 * Track a lead conversion event for Meta Pixel
 */
export const trackMetaLead = () => {
  if (typeof window !== 'undefined' && typeof window.trackMetaLead === 'function') {
    window.trackMetaLead();
    return true;
  }
  console.log('Meta Pixel: trackMetaLead not available (pixel may not be initialized)');
  return false;
};

/**
 * Track a conversion event for Google Ads
 */
export const trackGoogleAdsLead = () => {
  if (typeof window !== 'undefined' && typeof window.trackGoogleAdsLead === 'function') {
    window.trackGoogleAdsLead();
    return true;
  }
  console.log('Google Ads: trackGoogleAdsLead not available (tag may not be initialized)');
  return false;
};

/**
 * Track lead conversion on both Meta Pixel and Google Ads
 */
export const trackLeadConversion = () => {
  trackMetaLead();
  trackGoogleAdsLead();
};

/**
 * Track custom event for Meta Pixel
 * @param {string} eventName - The event name (e.g., 'InitiateCheckout', 'CompleteRegistration')
 * @param {object} params - Optional event parameters
 */
export const trackMetaEvent = (eventName, params = {}) => {
  if (typeof window !== 'undefined' && typeof window.fbq !== 'undefined') {
    window.fbq('track', eventName, params);
    console.log(`Meta Pixel: ${eventName} event tracked`, params);
    return true;
  }
  return false;
};

/**
 * Track custom event for Google Analytics/Ads
 * @param {string} eventName - The event name
 * @param {object} params - Optional event parameters
 */
export const trackGoogleEvent = (eventName, params = {}) => {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, params);
    console.log(`Google Analytics: ${eventName} event tracked`, params);
    return true;
  }
  return false;
};

/**
 * Track quiz start event
 * @param {string} treatmentType - The treatment type being started
 * @param {string} city - The city selected
 */
export const trackQuizStart = (treatmentType, city) => {
  trackMetaEvent('StartTrial', { content_name: treatmentType, content_category: city });
  trackGoogleEvent('quiz_start', { treatment: treatmentType, city: city });
};

/**
 * Track quiz completion event
 * @param {string} treatmentType - The treatment type completed
 * @param {string} city - The city selected
 * @param {string} band - The result band (GREEN, YELLOW, RED)
 * @param {number} score - The quiz score
 */
export const trackQuizComplete = (treatmentType, city, band, score) => {
  trackMetaEvent('CompleteRegistration', { 
    content_name: treatmentType, 
    content_category: city,
    status: band,
    value: score
  });
  trackGoogleEvent('quiz_complete', { 
    treatment: treatmentType, 
    city: city, 
    band: band,
    score: score
  });
};
