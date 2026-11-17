import { createSignal, onMount, Show, For } from 'solid-js';
import { useAuth } from '../services/auth';
import { Navigate } from '@solidjs/router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DialogModal } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CustomSelect } from '../components/ui/Select';
import { toast } from '../services/toast';
import {
  Users as UsersIcon,
  UserPlus as UserPlusIcon,
  ShieldCheck as ShieldIcon,
  MagnifyingGlass as SearchIcon,
  Trash as TrashIcon,
  User as UserIcon,
} from 'phosphor-solid';

interface UserItem {
  id: string;
  username: string;
  full_name: string;
  role: 'petani' | 'superadmin';
  created_at: string;
}

export default function Users() {
  const auth = useAuth();

  // Strict RBAC Guard: Super Admin Only
  if (!auth.isSuperAdmin()) {
    return <Navigate href="/dashboard" />;
  }

  const [usersList, setUsersList] = createSignal<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [createModalOpen, setCreateModalOpen] = createSignal(false);
  const [deleteTarget, setDeleteTarget] = createSignal<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [loading, setLoading] = createSignal(true);

  // Form State
  const [fullName, setFullName] = createSignal('');
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [role, setRole] = createSignal<'petani' | 'superadmin'>('petani');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch {
      setUsersList([]);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchUsers();
  });

  const filteredUsers = () => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return usersList();
    return usersList().filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  };

  const handleCreateUser = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName(),
          username: username(),
          password: password(),
          role: role(),
        }),
      });
      if (res.ok) {
        await fetchUsers();
        setCreateModalOpen(false);
        setFullName('');
        setUsername('');
        setPassword('');
        toast.success(`Pengguna "${fullName() || username()}" berhasil ditambahkan`);
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Gagal menambahkan pengguna';
        toast.error(errMsg);
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan saat menambahkan pengguna');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteUser = async () => {
    const target = deleteTarget();
    if (!target) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${target.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== target.id));
        setDeleteTarget(null);
        toast.success(`Pengguna "${target.name}" berhasil dihapus`);
      } else {
        toast.error('Gagal menghapus pengguna');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan saat menghapus pengguna');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div class="p-4 space-y-4">
      {/* Header Bar */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
            <UsersIcon size={20} weight="bold" />
          </div>
          <div>
            <h1 class="font-display font-black text-lg text-slate-900 dark:text-slate-100">
              Pengguna
            </h1>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          class="shadow-brand-orange"
        >
          <UserPlusIcon size={16} weight="bold" />
          <span>Tambah</span>
        </Button>
      </div>

      {/* Search Input */}
      <div class="relative flex items-center">
        <div class="absolute left-3.5 text-slate-400 pointer-events-none">
          <SearchIcon size={18} weight="bold" />
        </div>
        <input
          type="text"
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          placeholder="Cari nama atau username..."
          class="font-data w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-600 transition-all"
        />
      </div>

      {/* List Pengguna */}
      <div class="space-y-2">
        <For
          each={filteredUsers()}
          fallback={
            <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <UserIcon size={28} weight="duotone" class="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p class="font-data text-xs text-slate-400">Pengguna tidak ditemukan</p>
            </div>
          }
        >
          {(user) => (
            <Card
              variant="elevated"
              class="p-3.5 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-600 transition-all"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-700 to-purple-600 text-white flex items-center justify-center font-display font-black text-xs ring-2 ring-purple-100 dark:ring-purple-900/60 shadow-xs">
                  {user.full_name
                    .split(' ')
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <p class="font-display font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                    {user.full_name}
                  </p>
                  <p class="font-data text-[10px] text-slate-400 dark:text-slate-500">
                    @{user.username}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span
                  class={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase ${
                    user.role === 'superadmin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}
                >
                  <ShieldIcon size={12} weight="bold" />
                  {user.role}
                </span>

                <Show when={user.username !== 'admin'}>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: user.id, name: user.full_name || user.username })}
                    title="Hapus Pengguna"
                    class="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <TrashIcon size={16} weight="bold" />
                  </button>
                </Show>
              </div>
            </Card>
          )}
        </For>
      </div>

      {/* Ark UI Modal Tambah Pengguna */}
      <DialogModal
        open={createModalOpen()}
        onOpenChange={setCreateModalOpen}
        title="Tambah Pengguna"
        description="Akun lapangan baru"
      >
        <form onSubmit={handleCreateUser} class="space-y-3 pt-1">
          <div>
            <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              NAMA LENGKAP
            </label>
            <input
              type="text"
              value={fullName()}
              onInput={(e) => setFullName(e.currentTarget.value)}
              placeholder="Contoh: Pak Tani Santoso"
              class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              required
            />
          </div>

          <div>
            <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              USERNAME
            </label>
            <input
              type="text"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              placeholder="Contoh: tani_01"
              class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              required
            />
          </div>

          <div>
            <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              KATA SANDI
            </label>
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder="••••••••"
              class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              required
            />
          </div>

          <CustomSelect
            label="HAK AKSES / ROLE"
            items={[
              { label: 'Petani Lapangan', value: 'petani' },
              { label: 'Super Administrator', value: 'superadmin' },
            ]}
            value={role()}
            onChange={(val) => setRole(val as any)}
          />

          <div class="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={isSubmitting()}
              class="shadow-brand-orange"
            >
              <span>Simpan Akun</span>
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* Confirmation Modal for User Deletion */}
      <ConfirmDialog
        open={deleteTarget() !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Hapus Akun Pengguna"
        description={`Apakah Anda yakin ingin menghapus akun "${deleteTarget()?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
        loading={isDeleting()}
        onConfirm={confirmDeleteUser}
      />
    </div>
  );
}
