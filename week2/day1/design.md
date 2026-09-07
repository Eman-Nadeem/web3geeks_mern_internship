# DESIGN SYSTEM — "Clarity" Theme
For: Real-time collaborative document editor (Next.js 15+, App Router)

═══════════════════════════════════════
DESIGN PHILOSOPHY
═══════════════════════════════════════
This is a calm, high-trust productivity tool — think the visual confidence 
of Linear, Notion, and Vercel's dashboard, not a generic SaaS template. 
Every surface should feel intentional: restrained color use, real 
whitespace (not padding-for-padding's-sake), and typography doing the 
heavy lifting instead of decoration.

Explicitly avoid: purple-to-blue hero gradients, glassmorphism for its 
own sake, oversized rounded blobs, stock "AI sparkle" iconography used 
decoratively, centered hero sections with generic buzzword copy, drop 
shadows on everything, emoji as UI elements. If it looks like it came 
from a "SaaS landing page generator," redo it.

═══════════════════════════════════════
COLOR TOKENS
═══════════════════════════════════════
--bg-canvas:        #F5F5F9   /* app background, cool light lavender-gray */
--bg-surface:       #FFFFFF   /* cards, sidebar, panels */
--bg-surface-muted: #FAFAFC   /* nested/inset surfaces, table row hover */
--border-subtle:    #ECECF2
--border-default:   #E2E2EA

--text-primary:     #16161D   /* near-black, not pure black */
--text-secondary:   #6B6B76
--text-tertiary:    #9A9AA5

--accent-primary:   #6D5DF6   /* indigo/violet — primary actions, active nav */
--accent-primary-hover: #5B4CE0
--accent-soft-bg:   #EDEBFF   /* active nav item background */

--gradient-cta:     linear-gradient(135deg, #FF8A65 0%, #FF6B9D 100%)
                     /* used ONLY on the single primary "New Doc" 
                        sparkle affordance — not repeated elsewhere */

--status-success:   #1DAA61  / bg #E7F7EE   /* Complete */
--status-warning:   #E08A2E  / bg #FDF1E3   /* Review, In Progress */
--status-neutral:   #6B6B76  / bg #F1F1F4   /* Draft */
--status-info:      #3E7BFA  / bg #EAF1FF

--chart-blue:   #4C7EFF
--chart-orange: #FFA85C
--chart-green:  #3ECF8E

═══════════════════════════════════════
TYPOGRAPHY
═══════════════════════════════════════
Primary UI font: Geist Sans (next/font — native to the Next.js/Vercel 
ecosystem, not Inter).
Monospace (code blocks, doc metadata, timestamps): Geist Mono.

Type scale:
  Page title / greeting:   28px / 600 / -0.02em tracking / var(--text-primary)
  Section header:          15px / 600 / var(--text-primary)
  Body / doc titles:       14px / 500 / var(--text-primary)
  Secondary meta (owner, time): 13px / 400 / var(--text-secondary)
  Micro labels (badges):   12px / 600 / uppercase optional, tight tracking

Never use font-weight 300 or below for body text — reads as flimsy on 
light backgrounds. Never use pure black.

═══════════════════════════════════════
LAYOUT & SPACING
═══════════════════════════════════════
- 8px base spacing unit. Card padding: 20-24px. Section gaps: 24-32px.
- Sidebar: icon/navigation rail, white bg, 1px right border 
  (--border-subtle), active item = --accent-soft-bg pill with 
  --accent-primary icon, 8px radius.
- Border radius: 12px on cards, 8px on buttons/inputs/badges, 
  full-round only on avatars and status dots. Never radius >16px — 
  that's the "AI generated" tell.
- Shadows: single soft ambient shadow only — 
  0 1px 2px rgba(16,16,29,0.04), 0 4px 12px rgba(16,16,29,0.04). 
  No colored shadows, no glow effects.
- Top bar: search input with subtle border + ⌘F hint text, right-aligned 
  utility cluster (notification bell, avatar).

═══════════════════════════════════════
TAILWIND V4 CLASS CONVENTIONS
═══════════════════════════════════════
In Tailwind CSS v4, use native variable syntax and standard radius utilities:
- `bg-(--bg-surface)` instead of `bg-[var(--bg-surface)]`
- `border-(--border-subtle)` instead of `border-[var(--border-subtle)]`
- `text-(--text-primary)` instead of `text-[var(--text-primary)]`
- `rounded-xl` for 12px card radius
- `rounded-lg` for 8px button/input radius
- `rounded-md` for 6px micro badges
- `rounded-sm` for 4px tiny indicators
