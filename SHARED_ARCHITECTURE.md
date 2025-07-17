# Family Budget Mobile App - Shared Architecture

## 🏗️ Shared Code Structure

This mobile app shares business logic, types, and services with the web application for maximum code reuse and consistency.

### 📁 Shared Directories

```
src/
├── types/           # TypeScript type definitions
├── services/        # API service classes  
├── config/          # App constants and configuration
├── lib/
│   ├── validation.ts    # Zod validation schemas
│   └── utils/
│       ├── helpers.ts   # Utility functions
│       └── supabase/    # Supabase client (mobile-adapted)
└── hooks/           # React hooks
```

### 🔄 Code Reuse Benefits

- **100% Backend Logic Reuse**: All API calls, data transformations, and business logic
- **Type Safety**: Complete TypeScript support across platforms
- **Consistent Data Models**: Same interfaces and validation rules
- **Unified Constants**: Colors, routes, and configuration shared
- **Hungarian Localization**: All formatting and text handling

### 🚀 Usage Examples

```typescript
import { authService, budgetService } from '@/src/services';
import { User, BudgetPlan } from '@/src/types';
import { formatCurrency } from '@/src/lib/utils/helpers';

// Authentication
const user = await authService.signIn(email, password);

// Budget management
const budgets = await budgetService.getCurrentMonthBudget(user.id);

// Formatting
const amount = formatCurrency(150000); // "150 000 Ft"
```

### 🔧 Environment Setup

Create `.env` file with:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 📱 Mobile-Specific Features

- Native navigation with React Navigation
- Camera integration for barcode scanning
- Push notifications
- Offline data caching
- Platform-specific UI components

---

*This architecture enables rapid development by sharing 80%+ of the codebase between web and mobile platforms.*
