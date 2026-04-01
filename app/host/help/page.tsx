import { getTranslations } from 'next-intl/server'
import { HelpCenter } from './help-center'

export default async function HelpPage() {
  const t = await getTranslations('help')

  return <HelpCenter />
}
