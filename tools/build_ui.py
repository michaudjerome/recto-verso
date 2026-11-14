"""Génère data/ui/<langue>.json : les textes de l'interface dans les 7 langues, au tutoiement.
Usage : python tools/build_ui.py (depuis 03_APP). Modifier les textes ici, jamais dans les JSON."""
import json, pathlib

L = ['fr', 'en', 'es', 'it', 'pt', 'de', 'zh']
T = {
 # Premier lancement
 'ob.hello':       ['Bonjour !', 'Hello!', '¡Hola!', 'Ciao!', 'Olá!', 'Hallo!', '你好！'],
 'ob.native':      ['Quelle est ta langue ?', 'What is your language?', '¿Cuál es tu idioma?', 'Qual è la tua lingua?', 'Qual é a tua língua?', 'Was ist deine Sprache?', '你的母语是什么？'],
 'ob.variant':     ['Quelle variante ?', 'Which variety?', '¿Qué variante?', 'Quale variante?', 'Que variante?', 'Welche Variante?', '哪种变体？'],
 'ob.targets':     ['Quelles langues veux-tu apprendre ?', 'Which languages do you want to learn?', '¿Qué idiomas quieres aprender?', 'Quali lingue vuoi imparare?', 'Que línguas queres aprender?', 'Welche Sprachen möchtest du lernen?', '你想学哪些语言？'],
 'ob.targetsHint': ['Une ou plusieurs. Tu pourras en ajouter plus tard.', 'One or more. You can add others later.', 'Uno o varios. Podrás añadir más después.', 'Una o più. Potrai aggiungerne altre dopo.', 'Uma ou várias. Podes acrescentar mais tarde.', 'Eine oder mehrere. Du kannst später weitere hinzufügen.', '可以选一种或多种，以后还能再加。'],
 'ob.level':       ['Ton niveau en {lang} ?', 'Your level in {lang}?', '¿Tu nivel de {lang}?', 'Il tuo livello di {lang}?', 'O teu nível de {lang}?', 'Dein Niveau in {lang}?', '你的{lang}水平？'],
 'ob.name':        ['Comment t\'appelles-tu ?', 'What\'s your name?', '¿Cómo te llamas?', 'Come ti chiami?', 'Como te chamas?', 'Wie heißt du?', '你叫什么名字？'],
 'ob.nameHint':    ['Juste pour te saluer. Ton prénom reste sur ton téléphone.', 'Just to greet you. Your name stays on your phone.', 'Solo para saludarte. Tu nombre se queda en tu teléfono.', 'Solo per salutarti. Il tuo nome resta sul tuo telefono.', 'Só para te cumprimentar. O teu nome fica no teu telemóvel.', 'Nur zur Begrüßung. Dein Name bleibt auf deinem Handy.', '只是为了和你打招呼，名字只保存在你的手机上。'],
 'ob.namePh':      ['Ton prénom', 'Your first name', 'Tu nombre', 'Il tuo nome', 'O teu nome', 'Dein Vorname', '你的名字'],
 'ob.anim':        ['Ton appareil demande des animations réduites. Comment veux-tu que les cartes se retournent ?', 'Your device asks for reduced motion. How should the cards flip?', 'Tu dispositivo pide reducir el movimiento. ¿Cómo quieres que giren las cartas?', 'Il tuo dispositivo chiede animazioni ridotte. Come vuoi che si girino le carte?', 'O teu aparelho pede animações reduzidas. Como queres que as cartas se virem?', 'Dein Gerät möchte weniger Bewegung. Wie sollen sich die Karten umdrehen?', '你的设备开启了减少动态效果。卡片要怎么翻转？'],
 'ob.later':       ['Plus tard', 'Later', 'Más tarde', 'Più tardi', 'Mais tarde', 'Später', '以后再说'],
 'ob.next':        ['Continuer', 'Continue', 'Continuar', 'Continua', 'Continuar', 'Weiter', '继续'],
 'ob.start':       ['C\'est parti', 'Let\'s go', '¡Vamos!', 'Si parte', 'Vamos lá', 'Los geht\'s', '开始吧'],
 'anim.full':      ['Animations complètes', 'Full animations', 'Animaciones completas', 'Animazioni complete', 'Animações completas', 'Volle Animationen', '完整动画'],
 'anim.fullHint':  ['Les cartes se retournent en 3D.', 'Cards flip over in 3D.', 'Las cartas giran en 3D.', 'Le carte si girano in 3D.', 'As cartas viram-se em 3D.', 'Die Karten drehen sich in 3D.', '卡片以 3D 方式翻转。'],
 'anim.calm':      ['Animations sobres', 'Gentle animations', 'Animaciones suaves', 'Animazioni sobrie', 'Animações suaves', 'Sanfte Animationen', '简洁动画'],
 'anim.calmHint':  ['Les cartes se retournent à plat, sans grand mouvement.', 'Cards turn flat, without big movements.', 'Las cartas giran en plano, sin grandes movimientos.', 'Le carte si girano in piano, senza grandi movimenti.', 'As cartas viram-se na horizontal, sem grandes movimentos.', 'Die Karten drehen sich flach, ohne große Bewegung.', '卡片平面翻转，动作幅度小。'],
 # Niveaux
 'lvl.beginner':   ['Je débute', 'I\'m a beginner', 'Empiezo', 'Comincio', 'Estou a começar', 'Ich fange an', '我是初学者'],
 'lvl.A1':         ['Débutant (A1)', 'Beginner (A1)', 'Principiante (A1)', 'Principiante (A1)', 'Iniciante (A1)', 'Anfänger (A1)', '入门 (A1)'],
 'lvl.A2':         ['Élémentaire (A2)', 'Elementary (A2)', 'Elemental (A2)', 'Elementare (A2)', 'Elementar (A2)', 'Grundlagen (A2)', '初级 (A2)'],
 'lvl.B1':         ['Intermédiaire (B1)', 'Intermediate (B1)', 'Intermedio (B1)', 'Intermedio (B1)', 'Intermédio (B1)', 'Mittelstufe (B1)', '中级 (B1)'],
 'lvl.B2':         ['Avancé (B2)', 'Upper intermediate (B2)', 'Avanzado (B2)', 'Avanzato (B2)', 'Avançado (B2)', 'Fortgeschritten (B2)', '中高级 (B2)'],
 'lvl.HSK':        ['HSK {n}', 'HSK {n}', 'HSK {n}', 'HSK {n}', 'HSK {n}', 'HSK {n}', 'HSK {n} 级'],
 'lvl.HSK7':       ['HSK 7 à 9', 'HSK 7 to 9', 'HSK 7 a 9', 'HSK da 7 a 9', 'HSK 7 a 9', 'HSK 7 bis 9', 'HSK 7–9 级'],
 # Accueil
 'home.review':    ['Réviser', 'Review', 'Repasar', 'Ripassa', 'Rever', 'Wiederholen', '复习'],
 'home.play':      ['Jouer', 'Play', 'Jugar', 'Gioca', 'Jogar', 'Spielen', '游戏'],
 'home.discover':  ['Découvrir', 'Discover', 'Descubrir', 'Scopri', 'Descobrir', 'Entdecken', '发现'],
 'home.create':    ['Créer', 'Create', 'Crear', 'Crea', 'Criar', 'Erstellen', '创建'],
 'home.reviewSub': ['Tes cartes du jour', 'Today\'s cards', 'Tus cartas de hoy', 'Le tue carte di oggi', 'As tuas cartas de hoje', 'Deine Karten für heute', '今天的卡片'],
 'home.playSub':   ['Quiz, Memory, Écris ce que tu vois', 'Quiz, Memory, Write what you see', 'Quiz, Memory, Escribe lo que ves', 'Quiz, Memory, Scrivi ciò che vedi', 'Quiz, Memória, Escreve o que vês', 'Quiz, Memory, Schreib, was du siehst', '测验、记忆配对、看图写词'],
 'home.discoverSub':['De nouveaux mots', 'New words', 'Palabras nuevas', 'Parole nuove', 'Palavras novas', 'Neue Wörter', '新词'],
 'home.createSub': ['Tes propres cartes', 'Your own cards', 'Tus propias cartas', 'Le tue carte', 'As tuas próprias cartas', 'Deine eigenen Karten', '你自己的卡片'],
 'home.soon':      ['Bientôt ici 🌱', 'Coming soon 🌱', 'Muy pronto 🌱', 'Presto qui 🌱', 'Em breve 🌱', 'Bald da 🌱', '即将推出 🌱'],
 'home.soonHint':  ['On construit ce mode en ce moment. Retourne la carte pour revenir.', 'We\'re building this mode right now. Flip the card back.', 'Estamos creando este modo. Gira la carta para volver.', 'Stiamo costruendo questa modalità. Rigira la carta.', 'Estamos a construir este modo. Vira a carta para voltar.', 'Wir bauen diesen Modus gerade. Dreh die Karte zurück.', '这个模式正在制作中。再翻一次卡片返回。'],
 'home.streak':    ['{n} jour de suite', '{n} day in a row', '{n} día seguido', '{n} giorno di fila', '{n} dia seguido', '{n} Tag in Folge', '连续 {n} 天'],
 'home.streaks':   ['{n} jours de suite', '{n} days in a row', '{n} días seguidos', '{n} giorni di fila', '{n} dias seguidos', '{n} Tage in Folge', '连续 {n} 天'],
 'home.streak0':   ['Ta série commence aujourd\'hui 🌱', 'Your streak starts today 🌱', 'Tu racha empieza hoy 🌱', 'La tua serie inizia oggi 🌱', 'A tua série começa hoje 🌱', 'Deine Serie beginnt heute 🌱', '今天开始你的连续记录 🌱'],
 'home.learning':  ['J\'apprends', 'I\'m learning', 'Aprendo', 'Imparo', 'Aprendo', 'Ich lerne', '我在学'],
 # Langues
 'courses.title':  ['Tes langues', 'Your languages', 'Tus idiomas', 'Le tue lingue', 'As tuas línguas', 'Deine Sprachen', '你的语言'],
 'courses.add':    ['Ajouter une langue', 'Add a language', 'Añadir un idioma', 'Aggiungi una lingua', 'Acrescentar uma língua', 'Sprache hinzufügen', '添加语言'],
 'courses.none':   ['Tu apprends déjà toutes les langues ✨', 'You\'re already learning every language ✨', 'Ya aprendes todos los idiomas ✨', 'Stai già imparando tutte le lingue ✨', 'Já aprendes todas as línguas ✨', 'Du lernst schon alle Sprachen ✨', '你已经在学所有语言了 ✨'],
 'courses.remove': ['Retirer', 'Remove', 'Quitar', 'Rimuovi', 'Remover', 'Entfernen', '移除'],
 'courses.confirm':['Toucher encore pour retirer (la progression sera effacée)', 'Tap again to remove (progress will be erased)', 'Toca otra vez para quitar (se borrará el progreso)', 'Tocca di nuovo per rimuovere (i progressi saranno cancellati)', 'Toca outra vez para remover (o progresso será apagado)', 'Nochmal tippen zum Entfernen (Fortschritt wird gelöscht)', '再点一次即可移除（学习进度将被删除）'],
 # Réglages
 'set.title':      ['Réglages', 'Settings', 'Ajustes', 'Impostazioni', 'Definições', 'Einstellungen', '设置'],
 'set.name':       ['Ton prénom', 'Your first name', 'Tu nombre', 'Il tuo nome', 'O teu nome', 'Dein Vorname', '你的名字'],
 'set.native':     ['Ta langue', 'Your language', 'Tu idioma', 'La tua lingua', 'A tua língua', 'Deine Sprache', '你的母语'],
 'set.nativeHint': ['L\'interface et les traductions passent dans cette langue.', 'The app and translations switch to this language.', 'La aplicación y las traducciones pasan a este idioma.', 'L\'app e le traduzioni passano a questa lingua.', 'A aplicação e as traduções passam para esta língua.', 'App und Übersetzungen wechseln in diese Sprache.', '界面和翻译将切换为这种语言。'],
 'set.anim':       ['Animations', 'Animations', 'Animaciones', 'Animazioni', 'Animações', 'Animationen', '动画'],
 'set.version':    ['Version', 'Version', 'Versión', 'Versione', 'Versão', 'Version', '版本'],
 'set.update':     ['Rechercher une mise à jour', 'Check for updates', 'Buscar actualizaciones', 'Cerca aggiornamenti', 'Procurar atualizações', 'Nach Updates suchen', '检查更新'],
 'set.upToDate':   ['Tu as la dernière version ✨', 'You have the latest version ✨', 'Tienes la última versión ✨', 'Hai l\'ultima versione ✨', 'Tens a versão mais recente ✨', 'Du hast die neueste Version ✨', '已是最新版本 ✨'],
 'set.updating':   ['Mise à jour en cours…', 'Updating…', 'Actualizando…', 'Aggiornamento in corso…', 'A atualizar…', 'Wird aktualisiert…', '正在更新…'],
 'set.sources':    ['Sources et licences', 'Sources and licences', 'Fuentes y licencias', 'Fonti e licenze', 'Fontes e licenças', 'Quellen und Lizenzen', '来源与许可'],
 'set.saved':      ['Enregistré ✨', 'Saved ✨', 'Guardado ✨', 'Salvato ✨', 'Guardado ✨', 'Gespeichert ✨', '已保存 ✨'],
 'ui.back':        ['Retour', 'Back', 'Volver', 'Indietro', 'Voltar', 'Zurück', '返回'],
 'ui.close':       ['Fermer', 'Close', 'Cerrar', 'Chiudi', 'Fechar', 'Schließen', '关闭'],
 'ui.error':       ['Oups, quelque chose s\'est mal passé.', 'Oops, something went wrong.', 'Vaya, algo ha salido mal.', 'Ops, qualcosa è andato storto.', 'Ups, algo correu mal.', 'Hoppla, da ist etwas schiefgelaufen.', '哎呀，出了点问题。'],
 'ui.home':        ['Accueil', 'Home', 'Inicio', 'Home', 'Início', 'Start', '首页'],
 'upd.ready':      ['Mise à jour installée', 'Update installed', 'Actualización instalada', 'Aggiornamento installato', 'Atualização instalada', 'Update installiert', '更新已安装'],
 'upd.restart':    ['Redémarrer', 'Restart', 'Reiniciar', 'Riavvia', 'Reiniciar', 'Neu starten', '重新启动'],
 # Petits mots d'accueil (good mood uniquement)
 'greet.morning':  ['Bonjour ☀️', 'Good morning ☀️', '¡Buenos días! ☀️', 'Buongiorno ☀️', 'Bom dia ☀️', 'Guten Morgen ☀️', '早上好 ☀️'],
 'greet.day':      ['Coucou 🌻', 'Hi there 🌻', '¡Hola! 🌻', 'Ciao 🌻', 'Olá 🌻', 'Hallo 🌻', '你好 🌻'],
 'greet.afternoon':['Bon après-midi 🌞', 'Good afternoon 🌞', '¡Buenas tardes! 🌞', 'Buon pomeriggio 🌞', 'Boa tarde 🌞', 'Schönen Nachmittag 🌞', '下午好 🌞'],
 'greet.evening':  ['Bonsoir ✨', 'Good evening ✨', '¡Buenas noches! ✨', 'Buonasera ✨', 'Boa noite ✨', 'Guten Abend ✨', '晚上好 ✨'],
 'greet.night':    ['Douce nuit 🌙', 'Sweet night 🌙', 'Dulce noche 🌙', 'Dolce notte 🌙', 'Boa noite 🌙', 'Gute Nacht 🌙', '晚安 🌙'],
 'greet.l1':       ['On retourne quelques cartes ? 🌻', 'Shall we flip a few cards? 🌻', '¿Giramos unas cartas? 🌻', 'Giriamo qualche carta? 🌻', 'Viramos umas cartas? 🌻', 'Drehen wir ein paar Karten um? 🌻', '来翻几张卡片吧？🌻'],
 'greet.l2':       ['Un mot de plus aujourd\'hui ✨', 'One more word today ✨', 'Una palabra más hoy ✨', 'Una parola in più oggi ✨', 'Mais uma palavra hoje ✨', 'Heute ein Wort mehr ✨', '今天再多学一个词 ✨'],
 'greet.l3':       ['Chaque carte compte 🌞', 'Every card counts 🌞', 'Cada carta cuenta 🌞', 'Ogni carta conta 🌞', 'Cada carta conta 🌞', 'Jede Karte zählt 🌞', '每张卡片都算数 🌞'],
 'greet.l4':       ['Content de te revoir 💛', 'Good to see you again 💛', 'Qué alegría verte 💛', 'Che bello rivederti 💛', 'Que bom ver-te outra vez 💛', 'Schön, dich wiederzusehen 💛', '很高兴又见到你 💛'],
}
# Noms des langues, écrits dans chaque langue d'interface (minuscules en français, espagnol, italien, portugais)
NAMES = {
 'fr': {'fr': 'français', 'en': 'anglais', 'es': 'espagnol', 'it': 'italien', 'pt': 'portugais', 'de': 'allemand', 'zh': 'chinois'},
 'en': {'fr': 'French', 'en': 'English', 'es': 'Spanish', 'it': 'Italian', 'pt': 'Portuguese', 'de': 'German', 'zh': 'Chinese'},
 'es': {'fr': 'francés', 'en': 'inglés', 'es': 'español', 'it': 'italiano', 'pt': 'portugués', 'de': 'alemán', 'zh': 'chino'},
 'it': {'fr': 'francese', 'en': 'inglese', 'es': 'spagnolo', 'it': 'italiano', 'pt': 'portoghese', 'de': 'tedesco', 'zh': 'cinese'},
 'pt': {'fr': 'francês', 'en': 'inglês', 'es': 'espanhol', 'it': 'italiano', 'pt': 'português', 'de': 'alemão', 'zh': 'chinês'},
 'de': {'fr': 'Französisch', 'en': 'Englisch', 'es': 'Spanisch', 'it': 'Italienisch', 'pt': 'Portugiesisch', 'de': 'Deutsch', 'zh': 'Chinesisch'},
 'zh': {'fr': '法语', 'en': '英语', 'es': '西班牙语', 'it': '意大利语', 'pt': '葡萄牙语', 'de': '德语', 'zh': '中文'},
}
# Portugais du Brésil : « você » à la place de « tu », et vocabulaire brésilien
PT_BR = {
 'ob.native': 'Qual é a sua língua?', 'ob.targets': 'Quais línguas você quer aprender?',
 'ob.targetsHint': 'Uma ou várias. Você pode adicionar outras depois.', 'ob.level': 'Seu nível de {lang}?',
 'ob.name': 'Qual é o seu nome?', 'ob.nameHint': 'Só para cumprimentar você. Seu nome fica no seu celular.',
 'ob.namePh': 'Seu nome', 'ob.anim': 'Seu aparelho pede animações reduzidas. Como você quer que as cartas virem?',
 'anim.fullHint': 'As cartas viram em 3D.', 'anim.calmHint': 'As cartas viram no plano, sem grandes movimentos.',
 'lvl.beginner': 'Estou começando',
 'home.reviewSub': 'Suas cartas de hoje', 'home.createSub': 'Suas próprias cartas', 'home.playSub': 'Quiz, Memória, Escreva o que você vê',
 'home.soonHint': 'Estamos construindo este modo. Vire a carta para voltar.',
 'courses.title': 'Suas línguas', 'courses.add': 'Adicionar uma língua', 'courses.none': 'Você já aprende todas as línguas ✨',
 'courses.confirm': 'Toque de novo para remover (o progresso será apagado)',
 'set.name': 'Seu nome', 'set.native': 'Sua língua', 'set.nativeHint': 'O app e as traduções passam para esta língua.',
 'set.title': 'Configurações', 'set.upToDate': 'Você tem a versão mais recente ✨', 'set.updating': 'Atualizando…',
 'set.saved': 'Salvo ✨', 'ui.error': 'Ops, algo deu errado.', 'greet.l1': 'Vamos virar algumas cartas? 🌻',
 'greet.l4': 'Que bom ver você de novo 💛', 'home.streak0': 'Sua sequência começa hoje 🌱',
}
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'data' / 'ui'
out.mkdir(parents=True, exist_ok=True)
for i, code in enumerate(L):
    d = {k: v[i] for k, v in T.items()}
    d.update({f'lname.{k}': v for k, v in NAMES[code].items()})
    if code == 'pt':
        d['_var'] = {'pt-BR': PT_BR}
    (out / f'{code}.json').write_text(json.dumps(d, ensure_ascii=False, indent=0), encoding='utf-8')
assert all(len(v) == len(L) for v in T.values()), 'traduction manquante'
print(len(T), 'textes ×', len(L), 'langues')
