import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User, Phone, Camera, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [pkg, setPkg] = useState("STANDARD");
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  React.useEffect(() => {
    base44.entities.Package.filter({ active: true }, 'price', 10).then(setPackages).catch(() => {});
  }, []);

  const onAvatar = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setAvatar(file_url); }
    catch { setError("Profil fotoğrafı yüklenemedi"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Şifreler eşleşmiyor"); return; }
    if (password.length < 6) { setError("Şifre en az 6 karakter olmalı"); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
        try {
          await base44.auth.updateMe({
            full_name: fullName, username, phone, avatar,
            membership_status: "pending", package_id: packages.find((p) => p.name === pkg)?.id || "",
          });
          await base44.functions.invoke('ensure-member-id').catch(() => {});
        } catch {}
      }
      toast({ title: "Kayıt tamamlandı", description: "Hesabınız admin onayı bekliyor." });
      window.location.href = safeReturnTo();
    } catch (err) {
      setError(err.message || "Geçersiz doğrulama kodu");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Kod gönderildi", description: "E-postanızı kontrol edin." });
    } catch (err) {
      setError(err.message || "Kod gönderilemedi");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="E-postanı doğrula" subtitle={`${email} adresine bir kod gönderdik`}>
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Doğrulanıyor...</> : "Doğrula"}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">Kod gelmedi mi? <button onClick={handleResend} className="text-primary font-medium hover:underline">Tekrar gönder</button></p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus} title="Hesap oluştur" subtitle="FILMKEYFİ'ye katıl, sinemanın keyfini çıkar"
      footer={<>Zaten hesabın var mı? <Link to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")} className="text-primary font-medium hover:underline">Giriş yap</Link></>}
    >
      <Button variant="outline" className="w-full h-12 text-sm font-medium mb-6" onClick={handleGoogle}>
        <GoogleIcon className="w-5 h-5 mr-2" /> Google ile devam et
      </Button>
      <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">veya</span></div></div>

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {avatar ? <img src={avatar} alt="" className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>}
            <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer"><Camera className="w-3 h-3" /><input type="file" accept="image/*" className="hidden" onChange={onAvatar} /></label>
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="fullname">Ad Soyad</Label>
            <Input id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad Soyad" className="h-11" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="username">Kullanıcı Adı</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullanici" className="h-11" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx..." className="pl-9 h-11" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" placeholder="ornek@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Şifre Tekrar</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-9 h-11" required />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Paket Seçimi</Label>
          <div className="grid grid-cols-3 gap-2">
            {(packages.length ? packages : [{ name: 'BASIC', price: 0 }, { name: 'STANDARD', price: 0 }, { name: 'PREMIUM', price: 0 }]).map((p) => (
              <button type="button" key={p.name} onClick={() => setPkg(p.name)} className={`p-2 rounded-lg border text-center transition-colors ${pkg === p.name ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <span className="block text-xs font-bold">{p.name}</span>
                {p.price != null && <span className="block text-[10px] text-muted-foreground">₺{p.price}/ay</span>}
                {pkg === p.name && <CheckCircle2 className="w-3 h-3 text-primary mx-auto mt-0.5" />}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Kayıt tamamlandığında hesabınız "Onay Bekliyor" durumuna geçer.</p>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Hesap oluşturuluyor...</> : "Hesap Oluştur"}
        </Button>
      </form>
    </AuthLayout>
  );
}