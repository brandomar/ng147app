# 🏗️ System Architecture

## 📋 **Overview**

Dashboard Undeniable is a multi-tenant dashboard platform built with React, TypeScript, and Supabase. It provides real-time metric tracking, Google Sheets integration, and dynamic branding capabilities.

## 🎯 **Core Principles**

### **Multi-Tenancy**
- **Role-based permissions**: `undeniable`, `staff`, `client` roles
- **Data isolation**: Client-specific data filtering
- **Dynamic branding**: Per-client customization

### **Real-time Data**
- **Google Sheets sync**: Automated data synchronization
- **Live updates**: Real-time metric tracking
- **Configurable metrics**: Flexible metric definitions

### **Scalable Architecture**
- **Component-based**: Reusable React components
- **Context-driven state**: Centralized state management
- **Service-oriented**: Modular utility functions

## 🏛️ **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Components  │  Contexts  │  Hooks  │  Utils  │  Types    │
├─────────────────────────────────────────────────────────────┤
│                    State Management                         │
│  AppContext  │  AuthContext  │  BrandContext  │  Filter   │
├─────────────────────────────────────────────────────────────┤
│                    Backend (Supabase)                      │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Edge Functions  │  Auth  │  Storage      │
├─────────────────────────────────────────────────────────────┤
│                    External Services                        │
│  Google Sheets API  │  Email Service  │  File Storage   │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 **Security Model**

### **Authentication**
- **Supabase Auth**: Secure user authentication
- **JWT tokens**: Stateless authentication
- **Session management**: Automatic token refresh

### **Authorization**
- **Row Level Security (RLS)**: Database-level access control
- **Role-based permissions**: Hierarchical access control
- **Client isolation**: Tenant-specific data access

### **Data Protection**
- **Encrypted storage**: Sensitive data encryption
- **Secure APIs**: Protected endpoint access
- **Input validation**: Data sanitization

## 📊 **Data Flow**

### **Metric Data Flow**
```
Google Sheets → Edge Function → Database → React Context → Components
```

### **User Authentication Flow**
```
Login → Supabase Auth → JWT Token → Context State → Protected Routes
```

### **Branding Flow**
```
Client Selection → Brand Context → Dynamic Styling → UI Components
```

## 🗄️ **Database Schema**

### **Core Tables**
- **`clients`**: Client information and configuration
- **`client_tabs`**: Client-specific sheet configurations
- **`discovered_metrics`**: Sheet metadata and configurations
- **`metric_entries`**: Historical metric data
- **`unified_sync_status`**: Synchronization status

### **Security Tables**
- **`user_access_control`**: User permissions and roles
- **`user_client_access`**: Client assignment relationships

## 🔄 **State Management**

### **Context Hierarchy**
```
AppContext (Global)
├── User authentication
├── Client management
└── Navigation state

DashboardContext (Dashboard-specific)
├── Sheet configuration
├── Sync status
└── Metrics refresh

FilterContext (Filtering)
├── Sheet selection
├── Category filtering
└── Date filtering

BrandContext (Branding)
├── Company information
├── Color schemes
└── Asset management
```

## 🚀 **Performance Optimizations**

### **Frontend**
- **Component memoization**: Prevent unnecessary re-renders
- **Lazy loading**: Code splitting for better performance
- **Context optimization**: Minimize context updates

### **Backend**
- **Database indexing**: Optimized query performance
- **Caching strategies**: Reduce database load
- **Edge functions**: Serverless processing

## 🔧 **Development Patterns**

### **Component Architecture**
- **Shared components**: Reusable UI elements
- **Feature components**: Specific functionality
- **Layout components**: Page structure

### **State Management**
- **Context for global state**: App-wide state
- **Local state for UI**: Component-specific state
- **Custom hooks**: Reusable state logic

### **Error Handling**
- **Error boundaries**: Component-level error catching
- **Graceful degradation**: Fallback UI states
- **User feedback**: Clear error messages

## 📈 **Scalability Considerations**

### **Horizontal Scaling**
- **Stateless architecture**: No server-side state
- **Database optimization**: Efficient queries
- **CDN integration**: Static asset delivery

### **Vertical Scaling**
- **Component optimization**: Efficient rendering
- **Memory management**: Proper cleanup
- **Bundle optimization**: Smaller JavaScript bundles

## 🔍 **Monitoring & Debugging**

### **Logging System**
- **Structured logging**: Consistent log format
- **Debug levels**: Configurable verbosity
- **Error tracking**: Comprehensive error reporting

### **Performance Monitoring**
- **Bundle analysis**: JavaScript bundle optimization
- **Database queries**: Query performance tracking
- **User experience**: Real-time performance metrics

---

*This architecture documentation provides a comprehensive overview of the Dashboard Undeniable system design and implementation patterns.*
