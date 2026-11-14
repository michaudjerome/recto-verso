// Textes de l'interface dans la langue de la personne (data/ui/<langue>.json), au tutoiement
import { base } from './langs.js';

let dict = {}, fallback = {}, current = 'fr';
const v = () => (window.APP_STAMP ? `?v=${window.APP_STAMP}` : '');
const load = async (code) => (await fetch(`data/ui/${code}.json${v()}`)).json();

export async function setLocale(tag = 'fr') {
  current = tag;
  const code = base(tag);
  if (!Object.keys(fallback).length) fallback = await load('fr');
  const d = code === 'fr' ? fallback : await load(code).catch(() => fallback);
  dict = { ...d, ...(d._var?.[tag] || {}) };
  document.documentElement.lang = tag;
}

export const locale = () => current;

// t('ob.level', { lang: 'anglais' })
export function t(key, vars = {}) {
  const s = dict[key] ?? fallback[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Nom d'une langue écrit dans la langue de l'interface (« anglais », « English »…)
export const langName = (tag) => t(`lname.${base(tag)}`);
