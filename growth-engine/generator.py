import os
import json
import time
import requests
from datetime import datetime
from pathlib import Path

from config import (
    DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL,
    MODEL_NAME,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    CONTENT_DIR,
    PUBLIC_DIR,
    TOPIC_CATALOG,
    LANGUAGES
)
from svg_generator import generate_hero_svg


def _call_deepseek(prompt: str, system_prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.4,
        "max_tokens": 4000
    }
    
    resp = requests.post(f"{DEEPSEEK_BASE_URL}/chat/completions", headers=headers, json=payload, timeout=90)
    if resp.status_code != 200:
        raise Exception(f"DeepSeek API Error ({resp.status_code}): {resp.text}")
        
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def generate_article_for_language(topic: dict, lang: str) -> str:
    title = topic["titles"][lang]
    slug = topic["slug"]
    entity = topic.get("entity", "api")
    
    lang_names = {"pt": "Português europeu de Portugal (PT-PT)", "en": "English", "es": "Español"}
    
    system_prompt = f"""Tu és o Lead SEO Content Architect do portal global https://whatsusernames.link.
A tua missão é escrever artigos técnicos, autoritários, orientados a conversão e otimizados para topo do Google e motores de IA generativa (GEO/LLMs).
Escreve o artigo em {lang_names.get(lang, lang)}.

Regras Rígidas de Qualidade:
1. Começa SEMPRE com o bloco de frontmatter YAML exatamente no formato:
---
title: "{title}"
description: "<Meta descrição persuasiva de 140 a 160 caracteres com palavra-chave principal>"
date: "{datetime.now().strftime('%Y-%m-%d')}"
slug: "{slug}"
heroImage: "/blog/{slug}/hero.svg"
heroImageAlt: "<Descrição acessível do banner ilustrativo>"
entity: "{entity}"
---

2. Estrutura do Artigo:
   - Introdução cativante que aborda a dor imediata do utilizador.
   - H2 e H3 bem distribuídos com explicações práticas e sem enrolação.
   - Exemplos reais de links wa.me, sintaxe de URL (ex: `https://wa.me/351912345678?text=Ola%20gostaria...`) e parâmetros de texto codificado.
   - Tabelas comparativas ou listas estruturadas quando aplicável.
   - Links internos obrigatórios em formato markdown:
     * Para o glossário: [Username Key](/{lang}/glossary/username-key), [API WhatsApp](/{lang}/glossary/api) ou [Business Platform](/{lang}/glossary/business-platform).
     * Para outros artigos de apoio: [/blog/wa-me-username-alternativas], [/blog/como-reservar-username-whatsapp-2026], [/blog/usernames-vs-numero-telefone-privacidade].
   - Secção de Perguntas Frequentes (FAQ) detalhada com 3 a 4 perguntas e respostas diretas.
   - Termina OBRIGATORIAMENTE com o bloco de Call-To-Action padronizado:
---

> 💡 **Pronto para criar o seu link?** Utilize o nosso [gerador de link WhatsApp gratuito](/) para criar URLs `wa.me` e códigos QR personalizados, ou consulte o nosso [guia de como criar um link do WhatsApp](/how-to-create-a-whatsapp-link).

3. Extensão: Entre 900 a 1500 palavras de puro valor técnico e acionável.
4. Devolve APENAS o conteúdo MDX puro sem blocos ```mdx no início ou no fim.
"""

    user_prompt = f"""Escreve o artigo completo sobre o tema:
Título: {title}
Palavras-chave a cobrir: {', '.join(topic.get('keywords', []))}
Categoria: {topic.get('category')}
Slug: {slug}
Idioma de saída: {lang}"""

    content = _call_deepseek(user_prompt, system_prompt)
    
    # Limpa eventuais marcadores de código se o LLM os incluir
    content = content.strip()
    if content.startswith("```markdown"):
        content = content[11:]
    elif content.startswith("```mdx"):
        content = content[6:]
    elif content.startswith("```"):
        content = content[3:]
        
    if content.endswith("```"):
        content = content[:-3]
        
    return content.strip()


def publish_topic(topic: dict) -> dict:
    slug = topic["slug"]
    print(f"\n🚀 A iniciar geração de cluster de conteúdo para: {slug}")
    
    # 1. Gerar imagem Hero SVG
    hero_path = PUBLIC_DIR / slug / "hero.svg"
    generate_hero_svg(hero_path, icon_type=topic.get("icon_type", "message"), title=topic["titles"]["pt"])
    print(f"  ✅ Banner SVG gerado em: {hero_path}")
    
    # 2. Gerar artigos nos 3 idiomas
    results = {}
    for lang in LANGUAGES:
        print(f"  ✍️ A gerar conteúdo ({lang.upper()}) com DeepSeek V3...")
        mdx_content = generate_article_for_language(topic, lang)
        
        target_file = CONTENT_DIR / lang / f"{slug}.mdx"
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(mdx_content, encoding="utf-8")
        
        word_count = len(mdx_content.split())
        results[lang] = {"file": str(target_file), "words": word_count}
        print(f"    📄 Salvo {target_file.name} ({word_count} palavras)")
        time.sleep(1) # rate-limiting suave
        
    return results


def send_telegram_publication_alert(topic: dict, stats: dict):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
        
    slug = topic["slug"]
    title = topic["titles"]["pt"]
    
    lines = [
        "🚀🔥 <b>[SEO GROWTH FACTORY] Novo Cluster Publicado!</b>",
        "",
        f"📝 <b>Título:</b> <i>{title}</i>",
        f"🏷️ <b>Slug:</b> <code>/blog/{slug}</code>",
        f"📂 <b>Categoria:</b> {topic.get('category')}",
        "",
        "🌐 <b>Conteúdo Multilíngue Gerado:</b>",
        f" • 🇵🇹 PT: <b>{stats.get('pt', {}).get('words', 0)}</b> palavras",
        f" • 🇬🇧 EN: <b>{stats.get('en', {}).get('words', 0)}</b> palavras",
        f" • 🇪🇸 ES: <b>{stats.get('es', {}).get('words', 0)}</b> palavras",
        "",
        "🖼️ <b>Assets:</b> Hero SVG & JSON-LD FAQ Schemas integrados.",
        f"🔗 <b>Ver Artigo Live:</b> https://whatsusernames.link/pt/blog/{slug}",
        "",
        "⚡ <i>Pronto para indexação imediata no Google e motores de IA!</i>"
    ]
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": "\n".join(lines),
            "parse_mode": "HTML",
            "disable_web_page_preview": False
        }, timeout=10)
    except Exception as e:
        print(f"Erro ao enviar Telegram alert: {e}")
