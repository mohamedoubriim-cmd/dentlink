import { useEffect, useRef, useState } from 'react'
import { Camera, Save, User } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { getCurrentProfile, updateProfile, uploadAvatar } from '../../lib/api'
import type { UserProfile } from '../../types'

export default function PortalProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', clinic: '' })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [success, setSuccess] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (!p) return
      setProfile(p)
      setForm({ full_name: p.full_name || '', phone: p.phone || '', clinic: p.clinic || '' })
    })
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setAvatarError(null)
    try {
      const url = await uploadAvatar(file)
      await updateProfile({ avatar_url: url })
      setProfile((p) => p ? { ...p, avatar_url: url } : p)
    } catch (err: any) {
      setAvatarError(err?.message ?? 'Erreur lors du téléchargement')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await updateProfile(form)
    setProfile((p) => p ? { ...p, ...form } : p)
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (!profile) return null

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Mon profil</h1>

      <Card>
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-md">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                    setAvatarError('Image introuvable — réessayez')
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={36} className="text-slate-400" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-primary-700 transition-colors"
            >
              {uploadingAvatar
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={14} />
              }
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <p className="text-xs text-slate-400">JPG, PNG · Max 5 MB</p>
          {avatarError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{avatarError}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nom complet"
            value={form.full_name}
            onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
            placeholder="Dr. Ahmed Bennani"
          />
          <Input
            label="Cabinet / Clinique"
            value={form.clinic}
            onChange={(e) => setForm((p) => ({ ...p, clinic: e.target.value }))}
            placeholder="Cabinet Dentaire Casablanca"
          />
          <Input
            label="Téléphone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+212 6XX XXX XXX"
          />

          {success && (
            <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Profil mis à jour avec succès
            </p>
          )}

          <Button type="submit" loading={saving} icon={<Save size={15} />} className="w-full">
            Enregistrer
          </Button>
        </form>
      </Card>
    </div>
  )
}
