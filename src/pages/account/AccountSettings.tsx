import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { useAccount } from '@/lib/account'
import { ApiError } from '@/lib/api'

export function AccountSettings() {
  const { customer, updateProfile } = useAccount()

  const [name, setName] = useState(customer?.name ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileBusy(true)
    setProfileMsg(null)
    try {
      await updateProfile({ name, email })
      setProfileMsg({ text: 'Saved.', ok: true })
    } catch (err) {
      setProfileMsg({ text: err instanceof ApiError ? err.message : 'Could not save changes.', ok: false })
    }
    setProfileBusy(false)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', ok: false })
      return
    }
    setPasswordBusy(true)
    try {
      await updateProfile({ currentPassword, newPassword })
      setPasswordMsg({ text: 'Password updated.', ok: true })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMsg({ text: err instanceof ApiError ? err.message : 'Could not update password.', ok: false })
    }
    setPasswordBusy(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        {profileMsg && (
          <p className={`mt-3 text-sm ${profileMsg.ok ? 'text-primary' : 'text-red-400'}`}>{profileMsg.text}</p>
        )}
        <Button type="submit" size="sm" className="mt-4" disabled={profileBusy}>
          {profileBusy ? 'Saving…' : 'Save profile'}
        </Button>
      </form>

      <form onSubmit={savePassword} className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Change password</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Current password</Label>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>New password</Label>
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        {passwordMsg && (
          <p className={`mt-3 text-sm ${passwordMsg.ok ? 'text-primary' : 'text-red-400'}`}>{passwordMsg.text}</p>
        )}
        <Button type="submit" size="sm" className="mt-4" disabled={passwordBusy}>
          {passwordBusy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
