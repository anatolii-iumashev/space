import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Rocket, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.config.get().then(res => setRegistrationEnabled(res.data.registrationEnabled)).catch(() => {})
  }, [])

  if (api.auth.isLoggedIn()) {
    return <>{children}</>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await api.auth.login(email, password)
      } else {
        await api.auth.register(email, name, password)
        await api.auth.login(email, password)
      }
      window.location.reload()
    } catch (err: any) {
      setError(err.message || t('auth.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Rocket className="h-7 w-7 text-primary" />
            <span className="text-3xl font-bold tracking-tight">Space</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('auth.tagline')}</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-base font-medium">
              {isLogin ? t('auth.signIn') : t('auth.createAccount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <div className="grid gap-1.5">
                  <Label htmlFor="name">{t('auth.namePlaceholder')}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus={isLogin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">{t('auth.passwordPlaceholder')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : isLogin ? t('auth.signIn') : t('auth.createAccount')}
              </Button>
            </form>

            {registrationEnabled && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
                <button
                  onClick={() => { setIsLogin(!isLogin); setError('') }}
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  {isLogin ? t('auth.signUp') : t('auth.signIn')}
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

