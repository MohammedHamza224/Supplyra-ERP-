const fs = require('fs');

let settings = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

// Fix 1: Remove toast import and usage
settings = settings.replace("import toast from 'react-hot-toast';", "");
settings = settings.replace(/toast\.error\(/g, "alert(");
settings = settings.replace(/toast\.success\(/g, "alert(");

// Fix 2: isRtl and roleName
settings = settings.replace(
  "const { language, setLanguage, isRtl } = useTranslation();",
  "const { language, setLanguage } = useTranslation();\n  const isRtl = language === 'ar';"
);

settings = settings.replace(
  "const { user, profile, hasPermission, permissions } = useAuth();",
  "const { user, profile, hasPermission, permissions, roleName } = useAuth();"
);

settings = settings.replace(
  "const roleName = profile?.role_id?.name;",
  ""
);

// Fix 3: Import missing icons
settings = settings.replace(
  "import { Sun, Moon, User, UserRound, Globe, Shield, Database, Lock, Settings as SettingsIcon, Palette, ShieldCheck, CheckCircle2, XCircle, Eye, Plus, Edit2, Ban, DollarSign, X, Check, ClipboardList, Users, Truck, Factory, Package } from 'lucide-react';",
  "import { Sun, Moon, User, UserRound, Globe, Shield, Database, Lock, Settings as SettingsIcon, Palette, ShieldCheck, CheckCircle2, XCircle, Eye, Plus, Edit2, Ban, DollarSign, X, Check, ClipboardList, Users, Truck, Factory, Package, ShoppingCart, Building2, Warehouse } from 'lucide-react';"
);

fs.writeFileSync('src/pages/settings/Settings.tsx', settings);
