import re
def norm(w):
    w = w.lower().replace('_', ' ').replace('+的', '').replace('+', '').strip()
    w = re.sub(r"^(to |the |a |an |le |la |les |l'|el |los |las |il |lo |gli |der |die |das )", '', w)
    return w.strip(' .!?¡¿')
