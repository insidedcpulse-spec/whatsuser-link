import os
import yaml
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env.local")

def _get_deepseek_key() -> str:
    key = os.getenv("DEEPSEEK_API_KEY", "")
    if not key:
        creds_path = Path("/root/.dsh/.credentials.yaml")
        if creds_path.exists():
            try:
                data = yaml.safe_load(creds_path.read_text())
                key = data.get("refs", {}).get("DEEPSEEK_API_KEY", "")
            except Exception:
                pass
    return key

DEEPSEEK_API_KEY = _get_deepseek_key()
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
MODEL_NAME = "deepseek-chat"

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

CONTENT_DIR = BASE_DIR / "content" / "blog"
PUBLIC_DIR = BASE_DIR / "public" / "blog"
MESSAGES_DIR = BASE_DIR / "messages"

LANGUAGES = ["pt", "en", "es"]

TOPIC_CATALOG = [
    {
        "id": "wa-me-mensagem-personalizada-2026",
        "slug": "link-whatsapp-mensagem-personalizada-guia-2026",
        "category": "Marketing & Conversão",
        "entity": "api",
        "icon_type": "message",
        "titles": {
            "pt": "Como Criar Link do WhatsApp com Mensagem Personalizada Pronta em 2026",
            "en": "How to Create a WhatsApp Link with Pre-Filled Custom Message in 2026",
            "es": "Cómo Crear un Enlace de WhatsApp con Mensaje Predefinido en 2026"
        },
        "keywords": ["link whatsapp mensagem personalizada", "wa.me mensagem automatica", "gerar link whatsapp texto pronto", "whatsapp link pre filled message"]
    },
    {
        "id": "whatsapp-link-tiktok-bio-2026",
        "slug": "whatsapp-link-tiktok-bio-2026",
        "category": "Redes Sociais & Tráfego",
        "entity": "availability",
        "icon_type": "tiktok",
        "titles": {
            "pt": "Como Colocar Link do WhatsApp na Bio do TikTok em 2026 (Sem Bloqueios)",
            "en": "How to Put a WhatsApp Link in Your TikTok Bio in 2026 (No Blocks)",
            "es": "Cómo Poner el Enlace de WhatsApp en la Bio de TikTok en 2026 (Sin Bloqueos)"
        },
        "keywords": ["link whatsapp tiktok bio", "colocar whatsapp no tiktok", "tiktok bio whatsapp link 2026"]
    },
    {
        "id": "whatsapp-catalogo-vendas-links-2026",
        "slug": "como-vender-pelo-whatsapp-links-diretos-catalogo",
        "category": "E-Commerce & Vendas",
        "entity": "business-platform",
        "icon_type": "shopping",
        "titles": {
            "pt": "Como Vender pelo WhatsApp Usando Links Diretos de Produto e Catálogo",
            "en": "How to Sell on WhatsApp Using Direct Product and Catalog Links",
            "es": "Cómo Vender por WhatsApp Usando Enlaces Diretos de Produtos e Catálogo"
        },
        "keywords": ["vender whatsapp link direto", "link catalogo whatsapp business", "whatsapp direct checkout link"]
    },
    {
        "id": "whatsapp-esconder-numero-privacidade-empresas",
        "slug": "como-esconder-numero-whatsapp-link-privacidade",
        "category": "Privacidade & Segurança",
        "entity": "username-key",
        "icon_type": "shield",
        "titles": {
            "pt": "Como Esconder o Número de Telefone no WhatsApp Usando Usernames e Links Seguros",
            "en": "How to Hide Your Phone Number on WhatsApp Using Usernames and Secure Links",
            "es": "Cómo Ocultar el Número de Teléfono en WhatsApp Usando Usernames y Enlaces Seguros"
        },
        "keywords": ["esconder numero whatsapp", "link whatsapp sem mostrar telefone", "whatsapp username privacy guide"]
    },
    {
        "id": "whatsapp-multiplos-atendentes-link-rotativo",
        "slug": "whatsapp-link-rotativo-multiplos-atendentes-2026",
        "category": "Atendimento & Automação",
        "entity": "api",
        "icon_type": "users",
        "titles": {
            "pt": "Link do WhatsApp para Múltiplos Atendentes: Como Criar um Link Rotativo",
            "en": "WhatsApp Link for Multiple Agents: How to Create a Rotating Team Link",
            "es": "Enlace de WhatsApp para Múltiples Agentes: Cómo Crear un Enlace Rotativo"
        },
        "keywords": ["link whatsapp multiplos atendentes", "whatsapp rotativo vendas", "whatsapp round robin link"]
    }
]
