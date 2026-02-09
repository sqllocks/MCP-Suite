/**
 * Extended Power BI Dashboard Mockups
 * 15+ Additional Industry Templates with Advanced Features
 * Based on community best practices and highly-rated examples
 */

import { PowerBIDashboardGenerator, DashboardMockup, DashboardPage, DashboardVisual } from '../diagrams/powerbi-dashboard-generator';

export class ExtendedPowerBIDashboards {
  private generator: PowerBIDashboardGenerator;

  constructor() {
    this.generator = new PowerBIDashboardGenerator();
  }

  /**
   * HR / People Analytics Dashboard
   * Best Practice: Clear KPIs, diversity metrics, trend analysis
   */
  createHRAnalytics(): DashboardMockup {
    return {
      name: 'HR & People Analytics',
      theme: 'modern',
      description: 'Workforce insights and talent analytics',
      pages: [{
        name: 'Workforce Overview',
        layout: 'wide',
        visuals: [
          // Top KPIs
          { id: 'headcount', type: 'card', title: 'Total Headcount', 
            position: { x: 20, y: 20, width: 220, height: 140 },
            data: { value: '2,847', trend: 'up', trendValue: '+127' } },
          { id: 'attrition', type: 'gauge', title: 'Attrition Rate', 
            position: { x: 260, y: 20, width: 220, height: 140 } },
          { id: 'openroles', type: 'card', title: 'Open Positions', 
            position: { x: 500, y: 20, width: 220, height: 140 },
            data: { value: '142', trend: 'down', trendValue: '-8' } },
          { id: 'timetohire', type: 'card', title: 'Avg Time to Hire (Days)', 
            position: { x: 740, y: 20, width: 220, height: 140 },
            data: { value: '38', trend: 'down', trendValue: '-5' } },
          { id: 'engagement', type: 'gauge', title: 'Employee Engagement', 
            position: { x: 980, y: 20, width: 220, height: 140 } },

          // Trends
          { id: 'hiring-trend', type: 'line-chart', title: 'Hiring Trend (Last 12 Months)', 
            position: { x: 20, y: 180, width: 580, height: 280 },
            data: { 
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              values: [45, 52, 48, 67, 72, 65, 78, 82, 75, 88, 92, 85]
            }},
          { id: 'attrition-dept', type: 'bar-chart', title: 'Attrition by Department', 
            position: { x: 620, y: 180, width: 580, height: 280 },
            data: {
              labels: ['Engineering', 'Sales', 'Marketing', 'Operations', 'Finance'],
              values: [8.5, 12.3, 6.8, 9.2, 5.4]
            }},

          // Demographics
          { id: 'age-dist', type: 'bar-chart', title: 'Age Distribution', 
            position: { x: 20, y: 480, width: 380, height: 280 },
            data: {
              labels: ['18-25', '26-35', '36-45', '46-55', '56+'],
              values: [15, 42, 28, 12, 3]
            }},
          { id: 'tenure', type: 'bar-chart', title: 'Tenure Distribution', 
            position: { x: 420, y: 480, width: 380, height: 280 },
            data: {
              labels: ['<1yr', '1-3yr', '3-5yr', '5-10yr', '10+yr'],
              values: [22, 35, 25, 12, 6]
            }},
          { id: 'diversity', type: 'pie-chart', title: 'Diversity Metrics', 
            position: { x: 820, y: 480, width: 380, height: 280 },
            data: {
              labels: ['Female', 'Male', 'Non-binary', 'Prefer not to say'],
              values: [42, 54, 3, 1]
            }},
        ],
      }],
    };
  }

  /**
   * Marketing Campaign Performance
   * Best Practice: Multi-channel view, ROI focus, funnel visualization
   */
  createMarketingCampaign(): DashboardMockup {
    return {
      name: 'Marketing Campaign Performance',
      theme: 'modern',
      description: 'Multi-channel campaign analytics and ROI',
      pages: [{
        name: 'Campaign Overview',
        layout: 'wide',
        visuals: [
          // Campaign KPIs
          { id: 'impressions', type: 'kpi', title: 'Total Impressions', 
            position: { x: 20, y: 20, width: 230, height: 150 },
            data: { value: '24.8M', trend: 'up', trendValue: '+18%' } },
          { id: 'clicks', type: 'kpi', title: 'Total Clicks', 
            position: { x: 270, y: 20, width: 230, height: 150 },
            data: { value: '847K', trend: 'up', trendValue: '+22%' } },
          { id: 'conversions', type: 'kpi', title: 'Conversions', 
            position: { x: 520, y: 20, width: 230, height: 150 },
            data: { value: '12,847', trend: 'up', trendValue: '+15%' } },
          { id: 'roi', type: 'kpi', title: 'Campaign ROI', 
            position: { x: 770, y: 20, width: 230, height: 150 },
            data: { value: '342%', trend: 'up', trendValue: '+28%' } },

          // Channel Performance
          { id: 'channel-compare', type: 'bar-chart', title: 'Performance by Channel', 
            position: { x: 20, y: 190, width: 580, height: 300 },
            data: {
              labels: ['Email', 'Social Media', 'Search Ads', 'Display', 'Referral'],
              values: [24, 38, 42, 18, 28]
            }},
          { id: 'budget-spend', type: 'combo-chart', title: 'Budget vs Actual Spend', 
            position: { x: 620, y: 190, width: 580, height: 300 } },

          // Funnel & Trends
          { id: 'conversion-funnel', type: 'funnel', title: 'Conversion Funnel', 
            position: { x: 20, y: 510, width: 390, height: 280 } },
          { id: 'daily-performance', type: 'line-chart', title: 'Daily Performance Trend', 
            position: { x: 430, y: 510, width: 770, height: 280 },
            data: {
              labels: Array.from({length: 30}, (_, i) => `Day ${i+1}`),
              values: Array.from({length: 30}, () => Math.floor(Math.random() * 40) + 60)
            }},
        ],
      }],
    };
  }

  /**
   * IT Operations Dashboard
   * Best Practice: Real-time monitoring, incident tracking, SLA compliance
   */
  createITOperations(): DashboardMockup {
    return {
      name: 'IT Operations Dashboard',
      theme: 'dark',
      description: 'Real-time IT infrastructure monitoring',
      pages: [{
        name: 'System Health',
        layout: 'wide',
        visuals: [
          // System Status
          { id: 'uptime', type: 'gauge', title: 'System Uptime', 
            position: { x: 20, y: 20, width: 240, height: 160 } },
          { id: 'incidents', type: 'card', title: 'Active Incidents', 
            position: { x: 280, y: 20, width: 240, height: 160 },
            data: { value: '3', trend: 'down', trendValue: '-2' } },
          { id: 'response', type: 'card', title: 'Avg Response Time (min)', 
            position: { x: 540, y: 20, width: 240, height: 160 },
            data: { value: '8', trend: 'down', trendValue: '-3' } },
          { id: 'sla', type: 'gauge', title: 'SLA Compliance', 
            position: { x: 800, y: 20, width: 240, height: 160 } },

          // Real-time Metrics
          { id: 'cpu-usage', type: 'line-chart', title: 'CPU Usage (Last Hour)', 
            position: { x: 20, y: 200, width: 510, height: 260 } },
          { id: 'memory-usage', type: 'line-chart', title: 'Memory Usage (Last Hour)', 
            position: { x: 550, y: 200, width: 510, height: 260 } },

          // Incidents & Alerts
          { id: 'incident-severity', type: 'pie-chart', title: 'Incidents by Severity', 
            position: { x: 20, y: 480, width: 340, height: 280 } },
          { id: 'incident-table', type: 'table', title: 'Active Incidents', 
            position: { x: 380, y: 480, width: 680, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Logistics & Transportation
   * Best Practice: Route optimization, delivery tracking, driver performance
   */
  createLogistics(): DashboardMockup {
    return {
      name: 'Logistics & Transportation',
      theme: 'professional',
      description: 'Fleet management and delivery tracking',
      pages: [{
        name: 'Fleet Overview',
        layout: 'wide',
        visuals: [
          // Fleet KPIs
          { id: 'vehicles', type: 'card', title: 'Active Vehicles', 
            position: { x: 20, y: 20, width: 200, height: 130 },
            data: { value: '247', trend: 'up', trendValue: '+12' } },
          { id: 'deliveries', type: 'card', title: "Today's Deliveries", 
            position: { x: 240, y: 20, width: 200, height: 130 },
            data: { value: '1,847', trend: 'up', trendValue: '+143' } },
          { id: 'ontime', type: 'gauge', title: 'On-Time %', 
            position: { x: 460, y: 20, width: 200, height: 130 } },
          { id: 'fuel', type: 'card', title: 'Fuel Efficiency (MPG)', 
            position: { x: 680, y: 20, width: 200, height: 130 },
            data: { value: '8.4', trend: 'up', trendValue: '+0.3' } },

          // Geographic & Routes
          { id: 'route-map', type: 'map', title: 'Active Routes', 
            position: { x: 20, y: 170, width: 630, height: 320 } },
          { id: 'delivery-status', type: 'pie-chart', title: 'Delivery Status', 
            position: { x: 670, y: 170, width: 330, height: 320 } },

          // Performance
          { id: 'driver-performance', type: 'bar-chart', title: 'Top Drivers (Deliveries)', 
            position: { x: 20, y: 510, width: 480, height: 280 } },
          { id: 'delays', type: 'bar-chart', title: 'Delay Reasons', 
            position: { x: 520, y: 510, width: 480, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Energy & Utilities Monitoring
   * Best Practice: Real-time consumption, forecasting, anomaly detection
   */
  createEnergyUtilities(): DashboardMockup {
    return {
      name: 'Energy & Utilities Monitoring',
      theme: 'professional',
      description: 'Real-time energy consumption and grid management',
      pages: [{
        name: 'Energy Overview',
        layout: 'wide',
        visuals: [
          // Energy KPIs
          { id: 'consumption', type: 'kpi', title: 'Current Consumption (MW)', 
            position: { x: 20, y: 20, width: 240, height: 150 },
            data: { value: '847', trend: 'up', trendValue: '+12' } },
          { id: 'generation', type: 'kpi', title: 'Total Generation (MW)', 
            position: { x: 280, y: 20, width: 240, height: 150 },
            data: { value: '892', trend: 'up', trendValue: '+8' } },
          { id: 'efficiency', type: 'gauge', title: 'Grid Efficiency', 
            position: { x: 540, y: 20, width: 240, height: 150 } },
          { id: 'renewable', type: 'kpi', title: 'Renewable %', 
            position: { x: 800, y: 20, width: 240, height: 150 },
            data: { value: '42%', trend: 'up', trendValue: '+3%' } },

          // Real-time Monitoring
          { id: 'load-curve', type: 'line-chart', title: 'Load Curve (Last 24 Hours)', 
            position: { x: 20, y: 190, width: 750, height: 300 } },
          { id: 'source-mix', type: 'pie-chart', title: 'Energy Source Mix', 
            position: { x: 790, y: 190, width: 410, height: 300 },
            data: {
              labels: ['Solar', 'Wind', 'Natural Gas', 'Nuclear', 'Hydro'],
              values: [18, 24, 35, 15, 8]
            }},

          // Alerts & Forecasting
          { id: 'outages', type: 'table', title: 'Active Outages', 
            position: { x: 20, y: 510, width: 580, height: 280 } },
          { id: 'forecast', type: 'combo-chart', title: '7-Day Demand Forecast', 
            position: { x: 620, y: 510, width: 580, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Education / University Analytics
   * Best Practice: Student success metrics, enrollment trends, academic performance
   */
  createEducationAnalytics(): DashboardMockup {
    return {
      name: 'University Analytics',
      theme: 'light',
      description: 'Student success and institutional metrics',
      pages: [{
        name: 'Academic Performance',
        layout: 'wide',
        visuals: [
          // Academic KPIs
          { id: 'enrollment', type: 'card', title: 'Total Enrollment', 
            position: { x: 20, y: 20, width: 230, height: 140 },
            data: { value: '24,567', trend: 'up', trendValue: '+1,234' } },
          { id: 'retention', type: 'gauge', title: 'Retention Rate', 
            position: { x: 270, y: 20, width: 230, height: 140 } },
          { id: 'graduation', type: 'gauge', title: 'Graduation Rate (4-year)', 
            position: { x: 520, y: 20, width: 230, height: 140 } },
          { id: 'satisfaction', type: 'gauge', title: 'Student Satisfaction', 
            position: { x: 770, y: 20, width: 230, height: 140 } },

          // Enrollment Trends
          { id: 'enrollment-trend', type: 'line-chart', title: 'Enrollment Trend', 
            position: { x: 20, y: 180, width: 630, height: 300 } },
          { id: 'major-distribution', type: 'bar-chart', title: 'Students by Major', 
            position: { x: 670, y: 180, width: 530, height: 300 } },

          // Performance Metrics
          { id: 'gpa-distribution', type: 'bar-chart', title: 'GPA Distribution', 
            position: { x: 20, y: 500, width: 390, height: 280 } },
          { id: 'financial-aid', type: 'pie-chart', title: 'Financial Aid Distribution', 
            position: { x: 430, y: 500, width: 390, height: 280 } },
          { id: 'dept-performance', type: 'table', title: 'Department Performance', 
            position: { x: 840, y: 500, width: 360, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Hospitality / Hotel Operations
   * Best Practice: Occupancy tracking, revenue management, guest satisfaction
   */
  createHospitalityOps(): DashboardMockup {
    return {
      name: 'Hotel Operations Dashboard',
      theme: 'modern',
      description: 'Real-time hotel performance and guest analytics',
      pages: [{
        name: 'Hotel Performance',
        layout: 'wide',
        visuals: [
          // Hotel KPIs
          { id: 'occupancy', type: 'gauge', title: 'Occupancy Rate', 
            position: { x: 20, y: 20, width: 240, height: 150 } },
          { id: 'adr', type: 'kpi', title: 'Average Daily Rate', 
            position: { x: 280, y: 20, width: 240, height: 150 },
            data: { value: '$248', trend: 'up', trendValue: '+$18' } },
          { id: 'revpar', type: 'kpi', title: 'RevPAR', 
            position: { x: 540, y: 20, width: 240, height: 150 },
            data: { value: '$187', trend: 'up', trendValue: '+$12' } },
          { id: 'guest-score', type: 'gauge', title: 'Guest Satisfaction', 
            position: { x: 800, y: 20, width: 240, height: 150 } },

          // Trends & Bookings
          { id: 'booking-trend', type: 'line-chart', title: 'Booking Pace', 
            position: { x: 20, y: 190, width: 630, height: 300 } },
          { id: 'channel-mix', type: 'pie-chart', title: 'Booking Channel Mix', 
            position: { x: 670, y: 190, width: 530, height: 300 } },

          // Operations
          { id: 'room-status', type: 'pie-chart', title: 'Room Status', 
            position: { x: 20, y: 510, width: 380, height: 280 } },
          { id: 'housekeeping', type: 'table', title: 'Housekeeping Status', 
            position: { x: 420, y: 510, width: 380, height: 280 } },
          { id: 'amenities', type: 'bar-chart', title: 'Amenity Usage', 
            position: { x: 820, y: 510, width: 380, height: 280 } },
        ],
      }],
    };
  }

  /**
   * E-commerce Conversion Funnel
   * Best Practice: Detailed funnel analysis, cart abandonment, customer journey
   */
  createEcommerceFunnel(): DashboardMockup {
    return {
      name: 'E-commerce Conversion Funnel',
      theme: 'modern',
      description: 'Customer journey and conversion optimization',
      pages: [{
        name: 'Conversion Analysis',
        layout: 'wide',
        visuals: [
          // Conversion KPIs
          { id: 'visitors', type: 'card', title: 'Unique Visitors', 
            position: { x: 20, y: 20, width: 230, height: 130 },
            data: { value: '124.5K', trend: 'up', trendValue: '+8%' } },
          { id: 'sessions', type: 'card', title: 'Sessions', 
            position: { x: 270, y: 20, width: 230, height: 130 },
            data: { value: '187.2K', trend: 'up', trendValue: '+12%' } },
          { id: 'conversion', type: 'gauge', title: 'Conversion Rate', 
            position: { x: 520, y: 20, width: 230, height: 130 } },
          { id: 'cart-abandon', type: 'card', title: 'Cart Abandonment', 
            position: { x: 770, y: 20, width: 230, height: 130 },
            data: { value: '68%', trend: 'down', trendValue: '-3%' } },

          // Funnel Visualization
          { id: 'main-funnel', type: 'funnel', title: 'Conversion Funnel', 
            position: { x: 20, y: 170, width: 480, height: 320 } },
          { id: 'drop-off', type: 'bar-chart', title: 'Drop-off Points', 
            position: { x: 520, y: 170, width: 480, height: 320 } },

          // Customer Behavior
          { id: 'traffic-source', type: 'pie-chart', title: 'Traffic Sources', 
            position: { x: 20, y: 510, width: 390, height: 280 } },
          { id: 'device-breakdown', type: 'bar-chart', title: 'Conversions by Device', 
            position: { x: 430, y: 510, width: 390, height: 280 } },
          { id: 'top-products', type: 'table', title: 'Top Converting Products', 
            position: { x: 840, y: 510, width: 360, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Agriculture / Farm Analytics
   * Best Practice: Crop monitoring, yield prediction, weather integration
   */
  createAgricultureAnalytics(): DashboardMockup {
    return {
      name: 'Agriculture & Farm Analytics',
      theme: 'light',
      description: 'Crop monitoring and yield optimization',
      pages: [{
        name: 'Farm Operations',
        layout: 'wide',
        visuals: [
          // Farm KPIs
          { id: 'yield', type: 'kpi', title: 'Projected Yield (tons)', 
            position: { x: 20, y: 20, width: 240, height: 150 },
            data: { value: '2,847', trend: 'up', trendValue: '+127' } },
          { id: 'soil-health', type: 'gauge', title: 'Soil Health Index', 
            position: { x: 280, y: 20, width: 240, height: 150 } },
          { id: 'water-usage', type: 'card', title: 'Water Usage (gal/acre)', 
            position: { x: 540, y: 20, width: 240, height: 150 },
            data: { value: '22,847', trend: 'down', trendValue: '-1,234' } },
          { id: 'efficiency', type: 'gauge', title: 'Resource Efficiency', 
            position: { x: 800, y: 20, width: 240, height: 150 } },

          // Field Monitoring
          { id: 'field-map', type: 'map', title: 'Field Monitoring', 
            position: { x: 20, y: 190, width: 630, height: 320 } },
          { id: 'crop-health', type: 'bar-chart', title: 'Crop Health by Field', 
            position: { x: 670, y: 190, width: 530, height: 320 } },

          // Analytics
          { id: 'weather-trend', type: 'line-chart', title: '7-Day Weather Forecast', 
            position: { x: 20, y: 530, width: 580, height: 260 } },
          { id: 'yield-prediction', type: 'combo-chart', title: 'Yield Prediction', 
            position: { x: 620, y: 530, width: 580, height: 260 } },
        ],
      }],
    };
  }

  /**
   * Construction Project Management
   * Best Practice: Project timeline, budget tracking, safety metrics
   */
  createConstructionPM(): DashboardMockup {
    return {
      name: 'Construction Project Management',
      theme: 'corporate',
      description: 'Project tracking and site management',
      pages: [{
        name: 'Project Overview',
        layout: 'wide',
        visuals: [
          // Project KPIs
          { id: 'completion', type: 'gauge', title: 'Overall Completion %', 
            position: { x: 20, y: 20, width: 240, height: 150 } },
          { id: 'budget', type: 'kpi', title: 'Budget Status', 
            position: { x: 280, y: 20, width: 240, height: 150 },
            data: { value: '$8.4M', trend: 'neutral', trendValue: 'On Budget' } },
          { id: 'timeline', type: 'card', title: 'Days Behind Schedule', 
            position: { x: 540, y: 20, width: 240, height: 150 },
            data: { value: '3', trend: 'down', trendValue: 'Recovering' } },
          { id: 'safety', type: 'card', title: 'Days Since Incident', 
            position: { x: 800, y: 20, width: 240, height: 150 },
            data: { value: '127', trend: 'up' } },

          // Progress Tracking
          { id: 'project-timeline', type: 'bar-chart', title: 'Project Timeline', 
            position: { x: 20, y: 190, width: 750, height: 300 } },
          { id: 'phase-status', type: 'funnel', title: 'Phase Completion', 
            position: { x: 790, y: 190, width: 410, height: 300 } },

          // Resources & Safety
          { id: 'resource-allocation', type: 'bar-chart', title: 'Resource Allocation', 
            position: { x: 20, y: 510, width: 390, height: 280 } },
          { id: 'budget-breakdown', type: 'pie-chart', title: 'Budget Breakdown', 
            position: { x: 430, y: 510, width: 390, height: 280 } },
          { id: 'safety-metrics', type: 'table', title: 'Safety Metrics', 
            position: { x: 840, y: 510, width: 360, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Customer Success / SaaS Metrics
   * Best Practice: Cohort analysis, churn prediction, MRR tracking
   */
  createCustomerSuccess(): DashboardMockup {
    return {
      name: 'Customer Success - SaaS Metrics',
      theme: 'modern',
      description: 'Customer health and retention analytics',
      pages: [{
        name: 'Customer Health',
        layout: 'wide',
        visuals: [
          // SaaS KPIs
          { id: 'mrr', type: 'kpi', title: 'Monthly Recurring Revenue', 
            position: { x: 20, y: 20, width: 240, height: 150 },
            data: { value: '$847K', trend: 'up', trendValue: '+12%' } },
          { id: 'churn', type: 'card', title: 'Churn Rate', 
            position: { x: 280, y: 20, width: 240, height: 150 },
            data: { value: '2.3%', trend: 'down', trendValue: '-0.5%' } },
          { id: 'nps', type: 'gauge', title: 'Net Promoter Score', 
            position: { x: 540, y: 20, width: 240, height: 150 } },
          { id: 'arr', type: 'kpi', title: 'Annual Recurring Revenue', 
            position: { x: 800, y: 20, width: 240, height: 150 },
            data: { value: '$10.2M', trend: 'up', trendValue: '+18%' } },

          // Growth Metrics
          { id: 'mrr-trend', type: 'line-chart', title: 'MRR Growth Trend', 
            position: { x: 20, y: 190, width: 630, height: 300 } },
          { id: 'cohort-retention', type: 'matrix', title: 'Cohort Retention', 
            position: { x: 670, y: 190, width: 530, height: 300 } },

          // Customer Health
          { id: 'health-score', type: 'pie-chart', title: 'Customer Health Score', 
            position: { x: 20, y: 510, width: 390, height: 280 },
            data: {
              labels: ['Healthy', 'At Risk', 'Critical'],
              values: [72, 18, 10]
            }},
          { id: 'expansion', type: 'bar-chart', title: 'Expansion Opportunities', 
            position: { x: 430, y: 510, width: 390, height: 280 } },
          { id: 'support-tickets', type: 'line-chart', title: 'Support Ticket Trend', 
            position: { x: 840, y: 510, width: 360, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Social Media Analytics
   * Best Practice: Multi-platform view, engagement metrics, sentiment analysis
   */
  createSocialMediaAnalytics(): DashboardMockup {
    return {
      name: 'Social Media Analytics',
      theme: 'modern',
      description: 'Cross-platform social media performance',
      pages: [{
        name: 'Social Performance',
        layout: 'wide',
        visuals: [
          // Social KPIs
          { id: 'followers', type: 'kpi', title: 'Total Followers', 
            position: { x: 20, y: 20, width: 230, height: 140 },
            data: { value: '847K', trend: 'up', trendValue: '+12K' } },
          { id: 'engagement', type: 'gauge', title: 'Engagement Rate', 
            position: { x: 270, y: 20, width: 230, height: 140 } },
          { id: 'reach', type: 'kpi', title: 'Total Reach', 
            position: { x: 520, y: 20, width: 230, height: 140 },
            data: { value: '2.4M', trend: 'up', trendValue: '+18%' } },
          { id: 'sentiment', type: 'gauge', title: 'Sentiment Score', 
            position: { x: 770, y: 20, width: 230, height: 140 } },

          // Platform Comparison
          { id: 'platform-perf', type: 'bar-chart', title: 'Performance by Platform', 
            position: { x: 20, y: 180, width: 630, height: 300 },
            data: {
              labels: ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'TikTok'],
              values: [24, 42, 18, 28, 38]
            }},
          { id: 'content-types', type: 'pie-chart', title: 'Top Content Types', 
            position: { x: 670, y: 180, width: 530, height: 300 },
            data: {
              labels: ['Video', 'Image', 'Link', 'Text'],
              values: [45, 30, 15, 10]
            }},

          // Trending & Analysis
          { id: 'post-performance', type: 'table', title: 'Top Performing Posts', 
            position: { x: 20, y: 500, width: 580, height: 280 } },
          { id: 'posting-schedule', type: 'combo-chart', title: 'Optimal Posting Times', 
            position: { x: 620, y: 500, width: 580, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Cybersecurity Threat Dashboard
   * Best Practice: Real-time threats, incident response, vulnerability tracking
   */
  createCybersecurity(): DashboardMockup {
    return {
      name: 'Cybersecurity Threat Dashboard',
      theme: 'dark',
      description: 'Security operations center monitoring',
      pages: [{
        name: 'Threat Overview',
        layout: 'wide',
        visuals: [
          // Security KPIs
          { id: 'threats', type: 'card', title: 'Active Threats', 
            position: { x: 20, y: 20, width: 230, height: 140 },
            data: { value: '247', trend: 'down', trendValue: '-42' } },
          { id: 'vulnerabilities', type: 'card', title: 'Open Vulnerabilities', 
            position: { x: 270, y: 20, width: 230, height: 140 },
            data: { value: '18', trend: 'down', trendValue: '-5' } },
          { id: 'incidents', type: 'card', title: 'Security Incidents', 
            position: { x: 520, y: 20, width: 230, height: 140 },
            data: { value: '3', trend: 'neutral' } },
          { id: 'risk-score', type: 'gauge', title: 'Risk Score', 
            position: { x: 770, y: 20, width: 230, height: 140 } },

          // Threat Landscape
          { id: 'threat-map', type: 'map', title: 'Global Threat Map', 
            position: { x: 20, y: 180, width: 630, height: 300 } },
          { id: 'attack-vectors', type: 'pie-chart', title: 'Attack Vectors', 
            position: { x: 670, y: 180, width: 530, height: 300 },
            data: {
              labels: ['Phishing', 'Malware', 'DDoS', 'Brute Force', 'Zero-Day'],
              values: [42, 28, 15, 10, 5]
            }},

          // Monitoring & Response
          { id: 'threat-trend', type: 'line-chart', title: 'Threat Trend (24 Hours)', 
            position: { x: 20, y: 500, width: 580, height: 280 } },
          { id: 'incident-table', type: 'table', title: 'Recent Incidents', 
            position: { x: 620, y: 500, width: 580, height: 280 } },
        ],
      }],
    };
  }

  /**
   * Get all dashboard templates
   */
  getAllDashboards(): Record<string, () => DashboardMockup> {
    return {
      // Original templates (from PowerBIDashboardGenerator)
      'executive-dashboard': () => this.generator.createExecutiveDashboard(),
      'healthcare-clinical': () => this.generator.createHealthcareDashboard(),
      'financial-analytics': () => this.generator.createFinancialDashboard(),
      'retail-sales': () => this.generator.createRetailDashboard(),
      'data-quality': () => this.generator.createDataQualityDashboard(),
      'real-time-operations': () => this.generator.createRealTimeDashboard(),

      // Extended templates
      'hr-analytics': () => this.createHRAnalytics(),
      'marketing-campaign': () => this.createMarketingCampaign(),
      'it-operations': () => this.createITOperations(),
      'logistics-transportation': () => this.createLogistics(),
      'energy-utilities': () => this.createEnergyUtilities(),
      'education-analytics': () => this.createEducationAnalytics(),
      'hospitality-operations': () => this.createHospitalityOps(),
      'ecommerce-funnel': () => this.createEcommerceFunnel(),
      'agriculture-analytics': () => this.createAgricultureAnalytics(),
      'construction-pm': () => this.createConstructionPM(),
      'customer-success-saas': () => this.createCustomerSuccess(),
      'social-media-analytics': () => this.createSocialMediaAnalytics(),
      'cybersecurity-threat': () => this.createCybersecurity(),
    };
  }
}
