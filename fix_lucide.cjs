const fs = require('fs');

let content = fs.readFileSync('src/pages/settings/Settings.tsx', 'utf8');

const regex = /import\s*\{\s*[^}]+\s*\}\s*from\s*'lucide-react';/s;

const newImports = `import { 
  User, 
  Globe, 
  Shield, 
  Database, 
  Lock, 
  Settings as SettingsIcon,
  Palette,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  Edit2,
  Ban,
  DollarSign,
  X,
  Check,
  Package,
  Users,
  Truck,
  Factory,
  ShoppingCart,
  ClipboardList,
  Building2,
  KeyRound,
  Warehouse
} from 'lucide-react';`;

content = content.replace(regex, newImports);

fs.writeFileSync('src/pages/settings/Settings.tsx', content);
