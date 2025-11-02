'use client';

import { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FiPlus,
  FiTrash2,
  FiUsers,
  FiPercent,
  FiEdit,
  FiSave,
  FiX,
  FiChevronDown,
  FiChevronRight,
  FiSearch,
  FiGrid,
} from 'react-icons/fi';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';

interface GroupMember {
  id: string;
  assignedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    companyName: string | null;
    discountPercentage: number | null;
  };
}

interface GroupCategoryDiscount {
  id: string;
  categoryId: string;
  discountPercentage: number;
  category: {
    id: string;
    name: string;
  };
}

interface GroupManufacturerDiscount {
  id: string;
  manufacturerId: string;
  discountPercentage: number;
  manufacturer: {
    id: string;
    name: string;
    slug: string;
  };
}

interface GroupCategoryManufacturerDiscount {
  id: string;
  categoryId: string;
  manufacturerId: string;
  discountPercentage: number;
  category: {
    id: string;
    name: string;
  };
  manufacturer: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  stackingStrategy: 'MAX' | 'ADDITIVE' | 'PRIORITY';
  members: GroupMember[];
  categoryDiscounts: GroupCategoryDiscount[];
  manufacturerDiscounts: GroupManufacturerDiscount[];
  categoryManufacturerDiscounts: GroupCategoryManufacturerDiscount[];
}

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface B2BUser {
  id: string;
  name: string | null;
  email: string | null;
  companyName: string | null;
  discountPercentage: number | null;
}

interface Props {
  groups: any[];
  manufacturers: Manufacturer[];
  categories: Category[];
  users: B2BUser[];
}

type StackingOption = {
  value: Group['stackingStrategy'];
  label: string;
};

const stackingStrategyOptions: StackingOption[] = [
  { value: 'MAX', label: 'MAX (uzima najveći popust)' },
  { value: 'ADDITIVE', label: 'ADDITIVE (zbrajanje, max 100%)' },
  { value: 'PRIORITY', label: 'PRIORITY (prema prioritetu grupe)' },
];

interface CreateGroupForm {
  name: string;
  description: string;
  priority: string;
  stackingStrategy: Group['stackingStrategy'];
}

const defaultCreateForm: CreateGroupForm = {
  name: '',
  description: '',
  priority: '0',
  stackingStrategy: 'MAX',
};

const normalizeGroup = (group: any): Group => ({
  id: group.id,
  name: group.name,
  description: group.description ?? null,
  priority: typeof group.priority === 'number' ? group.priority : Number(group.priority ?? 0),
  stackingStrategy: group.stackingStrategy ?? 'MAX',
  members: (group.members ?? []).map((member: any) => ({
    id: member.id,
    assignedAt:
      typeof member.assignedAt === 'string'
        ? member.assignedAt
        : member.assignedAt
        ? new Date(member.assignedAt).toISOString()
        : '',
    user: {
      id: member.user?.id ?? '',
      name: member.user?.name ?? null,
      email: member.user?.email ?? null,
      companyName: member.user?.companyName ?? null,
      discountPercentage:
        typeof member.user?.discountPercentage === 'number'
          ? member.user.discountPercentage
          : member.user?.discountPercentage ?? null,
    },
  })),
  categoryDiscounts: (group.categoryDiscounts ?? []).map((discount: any) => ({
    id: discount.id,
    categoryId: discount.categoryId,
    discountPercentage: Number(discount.discountPercentage ?? 0),
    category: {
      id: discount.category?.id ?? discount.categoryId,
      name: discount.category?.name ?? '',
    },
  })),
  manufacturerDiscounts: (group.manufacturerDiscounts ?? []).map((discount: any) => ({
    id: discount.id,
    manufacturerId: discount.manufacturerId,
    discountPercentage: Number(discount.discountPercentage ?? 0),
    manufacturer: {
      id: discount.manufacturer?.id ?? discount.manufacturerId,
      name: discount.manufacturer?.name ?? '',
      slug: discount.manufacturer?.slug ?? '',
    },
  })),
  categoryManufacturerDiscounts: (group.categoryManufacturerDiscounts ?? []).map((discount: any) => ({
    id: discount.id,
    categoryId: discount.categoryId,
    manufacturerId: discount.manufacturerId,
    discountPercentage: Number(discount.discountPercentage ?? 0),
    category: {
      id: discount.category?.id ?? discount.categoryId,
      name: discount.category?.name ?? '',
    },
    manufacturer: {
      id: discount.manufacturer?.id ?? discount.manufacturerId,
      name: discount.manufacturer?.name ?? '',
      slug: discount.manufacturer?.slug ?? '',
    },
  })),
});

export function B2BGroupsClient({ groups: initialGroups, manufacturers, categories, users }: Props) {
  const [groups, setGroups] = useState<Group[]>(() => initialGroups.map(normalizeGroup));
  const [createForm, setCreateForm] = useState<CreateGroupForm>(defaultCreateForm);
  const [isCreating, setIsCreating] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CreateGroupForm>(defaultCreateForm);
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);
  const [memberSelection, setMemberSelection] = useState<Record<string, string>>({});
  const [categoryForms, setCategoryForms] = useState<Record<string, { categoryId: string; discountPercentage: string }>>({});
  const [manufacturerForms, setManufacturerForms] = useState<Record<string, { manufacturerId: string; discountPercentage: string }>>({});
  const [categoryManufacturerForms, setCategoryManufacturerForms] = useState<
    Record<string, { categoryId: string; manufacturerId: string; discountPercentage: string }>
  >({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const categoryLabelMap = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const cache = new Map<string, string>();

    const buildLabel = (categoryId: string): string => {
      if (cache.has(categoryId)) {
        return cache.get(categoryId)!;
      }
      const category = byId.get(categoryId);
      if (!category) return categoryId;
      if (!category.parentId) {
        cache.set(categoryId, category.name);
        return category.name;
      }
      const parentLabel = buildLabel(category.parentId);
      const label = `${parentLabel} › ${category.name}`;
      cache.set(categoryId, label);
      return label;
    };

    categories.forEach((category) => {
      cache.set(category.id, buildLabel(category.id));
    });

    return cache;
  }, [categories]);

  const refreshGroups = async () => {
    const response = await axios.get('/api/admin/b2b-groups');
    setGroups((response.data as any[]).map(normalizeGroup));
    setExpandedGroups((prev) =>
      (response.data as any[]).filter((group) => prev.includes(group.id)).map((group) => group.id)
    );
  };

  const resetForms = () => {
    setCreateForm(defaultCreateForm);
    setEditingGroupId(null);
    setEditForm(defaultCreateForm);
  };

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('Naziv grupe je obavezan.');
      return;
    }

    setSubmittingCreate(true);
    try {
      await axios.post('/api/admin/b2b-groups', {
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        priority: Number(createForm.priority) || 0,
        stackingStrategy: createForm.stackingStrategy,
      });
      toast.success('Grupa je uspješno kreirana.');
      await refreshGroups();
      setCreateForm(defaultCreateForm);
      setIsCreating(false);
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom kreiranja grupe.';
      toast.error(message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setEditForm({
      name: group.name,
      description: group.description ?? '',
      priority: String(group.priority ?? 0),
      stackingStrategy: group.stackingStrategy,
    });
  };

  const handleUpdateGroup = async (groupId: string) => {
    if (!editForm.name.trim()) {
      toast.error('Naziv grupe je obavezan.');
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.patch(`/api/admin/b2b-groups/${groupId}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        priority: Number(editForm.priority) || 0,
        stackingStrategy: editForm.stackingStrategy,
      });
      toast.success('Grupa je ažurirana.');
      await refreshGroups();
      resetForms();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom ažuriranja grupe.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleAddCategoryManufacturerDiscount = async (groupId: string) => {
    const form = categoryManufacturerForms[groupId];
    if (!form?.categoryId || !form.manufacturerId || !form.discountPercentage) {
      toast.error('Odaberite kategoriju, proizvođača i unesite popust.');
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.post(`/api/admin/b2b-groups/${groupId}/category-manufacturer-discounts`, {
        categoryId: form.categoryId,
        manufacturerId: form.manufacturerId,
        discountPercentage: Number(form.discountPercentage),
      });
      toast.success('Popust po kombinaciji je dodan.');
      setCategoryManufacturerForms((prev) => ({
        ...prev,
        [groupId]: { categoryId: '', manufacturerId: '', discountPercentage: '' },
      }));
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message =
        error?.response?.data?.message || 'Greška prilikom dodavanja popusta po kombinaciji.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleRemoveCategoryManufacturerDiscount = async (groupId: string, discountId: string) => {
    if (!window.confirm('Ukloniti popust po kombinaciji?')) {
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.delete(
        `/api/admin/b2b-groups/${groupId}/category-manufacturer-discounts/${discountId}`
      );
      toast.success('Popust je uklonjen.');
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message =
        error?.response?.data?.message || 'Greška prilikom uklanjanja popusta po kombinaciji.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovu grupu?')) {
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.delete(`/api/admin/b2b-groups/${groupId}`);
      toast.success('Grupa je obrisana.');
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom brisanja grupe.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleAddMember = async (groupId: string) => {
    const userId = memberSelection[groupId];
    if (!userId) {
      toast.error('Odaberite korisnika.');
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.post(`/api/admin/b2b-groups/${groupId}/members`, { userId });
      toast.success('Korisnik je dodan u grupu.');
      setMemberSelection((prev) => ({ ...prev, [groupId]: '' }));
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom dodavanja člana.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    if (!window.confirm('Ukloniti korisnika iz grupe?')) {
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.delete(`/api/admin/b2b-groups/${groupId}/members/${memberId}`);
      toast.success('Član je uklonjen.');
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom uklanjanja člana.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleAddCategoryDiscount = async (groupId: string) => {
    const form = categoryForms[groupId];
    if (!form?.categoryId || !form.discountPercentage) {
      toast.error('Odaberite kategoriju i unesite popust.');
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.post(`/api/admin/b2b-groups/${groupId}/category-discounts`, {
        categoryId: form.categoryId,
        discountPercentage: Number(form.discountPercentage),
      });
      toast.success('Popust po kategoriji je dodan.');
      setCategoryForms((prev) => ({ ...prev, [groupId]: { categoryId: '', discountPercentage: '' } }));
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom dodavanja popusta.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleRemoveCategoryDiscount = async (groupId: string, discountId: string) => {
    if (!window.confirm('Ukloniti popust po kategoriji?')) {
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.delete(`/api/admin/b2b-groups/${groupId}/category-discounts/${discountId}`);
      toast.success('Popust je uklonjen.');
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom uklanjanja popusta.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleAddManufacturerDiscount = async (groupId: string) => {
    const form = manufacturerForms[groupId];
    if (!form?.manufacturerId || !form.discountPercentage) {
      toast.error('Odaberite proizvođača i unesite popust.');
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.post(`/api/admin/b2b-groups/${groupId}/manufacturer-discounts`, {
        manufacturerId: form.manufacturerId,
        discountPercentage: Number(form.discountPercentage),
      });
      toast.success('Popust po proizvođaču je dodan.');
      setManufacturerForms((prev) => ({
        ...prev,
        [groupId]: { manufacturerId: '', discountPercentage: '' },
      }));
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom dodavanja popusta.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const handleRemoveManufacturerDiscount = async (groupId: string, discountId: string) => {
    if (!window.confirm('Ukloniti popust po proizvođaču?')) {
      return;
    }

    setLoadingGroupId(groupId);
    try {
      await axios.delete(`/api/admin/b2b-groups/${groupId}/manufacturer-discounts/${discountId}`);
      toast.success('Popust je uklonjen.');
      await refreshGroups();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || 'Greška prilikom uklanjanja popusta.';
      toast.error(message);
    } finally {
      setLoadingGroupId(null);
    }
  };

  const getAvailableUsersForGroup = (group: Group) => {
    const memberIds = new Set(group.members.map((member) => member.user.id));
    return users.filter((user) => !memberIds.has(user.id));
  };

  const getAvailableCategoriesForGroup = (group: Group) => {
    const categoryIds = new Set(group.categoryDiscounts.map((discount) => discount.categoryId));
    return categories.filter((category) => !categoryIds.has(category.id));
  };

  const getAvailableManufacturersForGroup = (group: Group) => {
    const manufacturerIds = new Set(group.manufacturerDiscounts.map((discount) => discount.manufacturerId));
    return manufacturers.filter((manufacturer) => !manufacturerIds.has(manufacturer.id));
  };

  const getAvailableManufacturersForCategoryCombination = (group: Group, categoryId?: string) => {
    if (!categoryId) {
      return [];
    }
    const takenManufacturerIds = new Set(
      group.categoryManufacturerDiscounts
        .filter((discount) => discount.categoryId === categoryId)
        .map((discount) => discount.manufacturerId)
    );
    return manufacturers.filter((manufacturer) => !takenManufacturerIds.has(manufacturer.id));
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) {
      return groups;
    }
    const term = searchTerm.toLowerCase();
    return groups.filter((group) => {
      const nameMatch = group.name.toLowerCase().includes(term);
      const descriptionMatch = group.description?.toLowerCase().includes(term);
      return nameMatch || descriptionMatch;
    });
  }, [groups, searchTerm]);

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiUsers /> B2B grupe
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Kreirajte grupe i upravljajte popustima po kategorijama i proizvođačima.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <FiSearch className="absolute left-3 top-2.5 text-amber/60" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pretraži grupe..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-amber/30 bg-white focus:border-amber focus:outline-none transition-all duration-200 text-sm md:text-base"
              />
            </div>
            <button
              onClick={() => {
                setIsCreating((prev) => !prev);
                setCreateForm(defaultCreateForm);
              }}
              className="md:w-auto w-full bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold flex items-center justify-center gap-2"
            >
              <FiPlus /> {isCreating ? 'Zatvori' : 'Nova grupa'}
            </button>
          </div>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-700 font-medium">Naziv grupe</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-gray-700 font-medium">Prioritet</label>
                <input
                  type="number"
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, priority: e.target.value }))}
                  className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-700 font-medium">Strategija kombinovanja</label>
                <select
                  value={createForm.stackingStrategy}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      stackingStrategy: e.target.value as Group['stackingStrategy'],
                    }))
                  }
                  className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2"
                >
                  {stackingStrategyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-700 font-medium">Opis (opcionalno)</label>
                <input
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setCreateForm(defaultCreateForm);
                }}
                className="bg-white border border-amber/30 text-gray-700 rounded-xl px-4 py-2 font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={submittingCreate}
                className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {submittingCreate ? 'Spremanje...' : 'Kreiraj grupu'}
              </button>
            </div>
          </form>
        )}
      </div>

      {filteredGroups.length === 0 ? (
        <div className="bg-white border border-amber/20 rounded-2xl p-10 text-center text-gray-600">
          {searchTerm
            ? 'Nema rezultata za zadani kriterij pretrage.'
            : 'Trenutno nema definisanih grupa. Kreirajte prvu grupu kako biste organizovali popuste.'}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => {
            const availableUsers = getAvailableUsersForGroup(group);
            const availableCategories = getAvailableCategoriesForGroup(group);
            const availableManufacturers = getAvailableManufacturersForGroup(group);
            const isBusy = loadingGroupId === group.id;
            const isExpanded = expandedGroups.includes(group.id);
            const categoryForm = categoryForms[group.id] ?? { categoryId: '', discountPercentage: '' };
            const manufacturerForm = manufacturerForms[group.id] ?? {
              manufacturerId: '',
              discountPercentage: '',
            };
            const categoryManufacturerForm =
              categoryManufacturerForms[group.id] ?? {
                categoryId: '',
                manufacturerId: '',
                discountPercentage: '',
              };
            const categoryOptions = availableCategories.map((category) => ({
              value: category.id,
              label: categoryLabelMap.get(category.id) || category.name,
            }));
            const manufacturerOptions = availableManufacturers.map((manufacturer) => ({
              value: manufacturer.id,
              label: manufacturer.name,
            }));
            const combinationManufacturerOptions = getAvailableManufacturersForCategoryCombination(
              group,
              categoryManufacturerForm.categoryId
            ).map((manufacturer) => ({
              value: manufacturer.id,
              label: manufacturer.name,
            }));

            return (
              <div
                key={group.id}
                className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm overflow-hidden"
              >
                <button
                  className="w-full text-left bg-gradient-to-r from-white/90 to-gray-50/90 border-b border-amber/20 px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between focus:outline-none"
                  onClick={() => toggleGroupExpanded(group.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 text-amber">
                      {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FiUsers /> {group.name}
                    </h3>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-4">
                    <div className="text-sm text-gray-600">
                      <span className="mr-4">Prioritet: <span className="font-medium">{group.priority}</span></span>
                      <span>Strategija: <span className="font-medium">{group.stackingStrategy}</span></span>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600">{group.description}</p>
                    )}
                  </div>
                </button>

                <div className="px-6 py-4 border-b border-amber/20 flex flex-wrap gap-2 justify-end bg-white">
                  {editingGroupId === group.id ? (
                    <>
                      <button
                        onClick={() => handleUpdateGroup(group.id)}
                        disabled={isBusy}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50"
                      >
                        <FiSave /> Spremi
                      </button>
                      <button
                        onClick={() => {
                          resetForms();
                        }}
                        className="bg-gradient-to-r from-white/95 to-gray-50/95 border border-amber/20 text-gray-700 rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:bg-white transition-all duration-200"
                      >
                        <FiX /> Otkaži
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEditGroup(group)}
                      className="bg-gradient-to-r from-white/95 to-gray-50/95 border border-amber/20 text-gray-700 rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:bg-white transition-all duration-200"
                    >
                      <FiEdit /> Uredi
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    disabled={isBusy}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50"
                  >
                    <FiTrash2 /> Obriši
                  </button>
                </div>

                {editingGroupId === group.id && (
                  <div className="px-6 py-4 border-b border-amber/20 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-700 font-medium">Naziv grupe</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2"
                        />
                      </div>
                      <div>
                        <label className="text-gray-700 font-medium">Prioritet</label>
                        <input
                          type="number"
                          value={editForm.priority}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}
                          className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="text-gray-700 font-medium">Strategija</label>
                        <select
                          value={editForm.stackingStrategy}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              stackingStrategy: e.target.value as Group['stackingStrategy'],
                            }))
                          }
                          className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2"
                        >
                          {stackingStrategyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-700 font-medium">Opis</label>
                        <input
                          value={editForm.description}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="mt-1 block w-full bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-4 py-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="p-6 space-y-6">
                  <div className="bg-white border border-amber/20 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiUsers /> Članovi grupe ({group.members.length})
                      </h4>
                      <div className="flex items-center gap-2">
                        <select
                          value={memberSelection[group.id] || ''}
                          onChange={(e) =>
                            setMemberSelection((prev) => ({ ...prev, [group.id]: e.target.value }))
                          }
                          className="bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
                        >
                          <option value="">Odaberite korisnika</option>
                          {availableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.companyName || user.email || user.name || 'Nepoznato'}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddMember(group.id)}
                          disabled={isBusy || !memberSelection[group.id]}
                          className="bg-gradient-to-r from-amber via-orange to-brown text-white rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 transition-all duration-200 disabled:opacity-50"
                        >
                          <FiPlus /> Dodaj
                        </button>
                      </div>
                    </div>
                    {group.members.length === 0 ? (
                      <p className="text-gray-600 text-sm">Grupa trenutno nema članova.</p>
                    ) : (
                      <div className="space-y-2">
                        {group.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between border border-amber/20 rounded-xl px-4 py-3"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {member.user.companyName || member.user.name || member.user.email || 'Nepoznato'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.user.email}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(group.id, member.id)}
                              disabled={isBusy}
                              className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-semibold"
                            >
                              <FiTrash2 /> Ukloni
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-amber/20 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiPercent /> Popusti po kategorijama ({group.categoryDiscounts.length})
                      </h4>
                      <div className="flex items-center gap-2">
                        <select
                          value={categoryForms[group.id]?.categoryId || ''}
                          onChange={(e) =>
                            setCategoryForms((prev) => ({
                              ...prev,
                              [group.id]: {
                                categoryId: e.target.value,
                                discountPercentage:
                                  prev[group.id]?.discountPercentage ?? '',
                              },
                            }))
                          }
                          className="bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
                        >
                          <option value="">Odaberite kategoriju</option>
                          {availableCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {categoryLabelMap.get(category.id) || category.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Popust %"
                          value={categoryForms[group.id]?.discountPercentage || ''}
                          onChange={(e) =>
                            setCategoryForms((prev) => ({
                              ...prev,
                              [group.id]: {
                                ...(prev[group.id] || { categoryId: '' }),
                                discountPercentage: e.target.value,
                              },
                            }))
                          }
                          className="w-28 bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
                        />
                        <button
                          onClick={() => handleAddCategoryDiscount(group.id)}
                          disabled={isBusy}
                          className="bg-gradient-to-r from-amber via-orange to-brown text-white rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 transition-all duration-200 disabled:opacity-50"
                        >
                          <FiPlus /> Dodaj
                        </button>
                      </div>
                    </div>
                    {group.categoryDiscounts.length === 0 ? (
                      <p className="text-gray-600 text-sm">Nema definiranih popusta po kategorijama.</p>
                    ) : (
                      <div className="space-y-2">
                        {group.categoryDiscounts.map((discount) => (
                          <div
                            key={discount.id}
                            className="flex items-center justify-between border border-amber/20 rounded-xl px-4 py-3"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900">
                                  {categoryLabelMap.get(discount.categoryId) || discount.category.name}
                                </span>
                                <Badge className="border-amber/40 bg-amber/10 text-amber-700">
                                  -{discount.discountPercentage}%
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500">Kategorijski popust</div>
                            </div>
                            <button
                              onClick={() => handleRemoveCategoryDiscount(group.id, discount.id)}
                              disabled={isBusy}
                              className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-semibold"
                            >
                              <FiTrash2 /> Ukloni
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-amber/20 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiPercent /> Popusti po proizvođačima ({group.manufacturerDiscounts.length})
                      </h4>
                      <div className="flex items-center gap-2">
                        <select
                          value={manufacturerForms[group.id]?.manufacturerId || ''}
                          onChange={(e) =>
                            setManufacturerForms((prev) => ({
                              ...prev,
                              [group.id]: {
                                manufacturerId: e.target.value,
                                discountPercentage:
                                  prev[group.id]?.discountPercentage ?? '',
                              },
                            }))
                          }
                          className="bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
                        >
                          <option value="">Odaberite proizvođača</option>
                          {availableManufacturers.map((manufacturer) => (
                            <option key={manufacturer.id} value={manufacturer.id}>
                              {manufacturer.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Popust %"
                          value={manufacturerForms[group.id]?.discountPercentage || ''}
                          onChange={(e) =>
                            setManufacturerForms((prev) => ({
                              ...prev,
                              [group.id]: {
                                ...(prev[group.id] || { manufacturerId: '' }),
                                discountPercentage: e.target.value,
                              },
                            }))
                          }
                          className="w-28 bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
                        />
                        <button
                          onClick={() => handleAddManufacturerDiscount(group.id)}
                          disabled={isBusy}
                          className="bg-gradient-to-r from-amber via-orange to-brown text-white rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 transition-all duration-200 disabled:opacity-50"
                        >
                          <FiPlus /> Dodaj
                        </button>
                      </div>
                    </div>
                    {group.manufacturerDiscounts.length === 0 ? (
                      <p className="text-gray-600 text-sm">Nema definiranih popusta po proizvođačima.</p>
                    ) : (
                      <div className="space-y-2">
                        {group.manufacturerDiscounts.map((discount) => (
                          <div
                            key={discount.id}
                            className="flex items-center justify-between border border-amber/20 rounded-xl px-4 py-3"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900">{discount.manufacturer.name}</span>
                                <Badge className="border-amber/40 bg-amber/10 text-amber-700">
                                  -{discount.discountPercentage}%
                                </Badge>
                              </div>
                              {discount.manufacturer.slug && (
                                <div className="text-xs text-gray-500">Slug: {discount.manufacturer.slug}</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveManufacturerDiscount(group.id, discount.id)}
                              disabled={isBusy}
                              className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-semibold"
                            >
                              <FiTrash2 /> Ukloni
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-amber/20 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiGrid /> Popusti po kombinaciji ({group.categoryManufacturerDiscounts.length})
                      </h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-full sm:w-56 lg:w-64">
                          <Combobox
                            options={categoryOptions}
                            value={categoryManufacturerForm.categoryId}
                            onChange={(value) =>
                              setCategoryManufacturerForms((prev) => {
                                const previous = prev[group.id] || {
                                  manufacturerId: '',
                                  discountPercentage: '',
                                };
                                const next = {
                                  ...previous,
                                  categoryId: value,
                                };
                                if (previous.categoryId !== value) {
                                  next.manufacturerId = '';
                                }
                                return {
                                  ...prev,
                                  [group.id]: next,
                                };
                              })
                            }
                            placeholder="Odaberite kategoriju"
                            searchPlaceholder="Pretraži kategorije..."
                            disabled={isBusy}
                          />
                        </div>
                        <div className="w-full sm:w-56 lg:w-64">
                          <Combobox
                            options={combinationManufacturerOptions}
                            value={categoryManufacturerForm.manufacturerId}
                            onChange={(value) =>
                              setCategoryManufacturerForms((prev) => ({
                                ...prev,
                                [group.id]: {
                                  ...(prev[group.id] || { categoryId: '', discountPercentage: '' }),
                                  manufacturerId: value,
                                },
                              }))
                            }
                            placeholder={
                              categoryManufacturerForm.categoryId
                                ? 'Odaberite proizvođača'
                                : 'Prvo odaberite kategoriju'
                            }
                            searchPlaceholder="Pretraži proizvođače..."
                            disabled={!categoryManufacturerForm.categoryId || isBusy}
                          />
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Popust %"
                          value={categoryManufacturerForm.discountPercentage}
                          onChange={(e) =>
                            setCategoryManufacturerForms((prev) => ({
                              ...prev,
                              [group.id]: {
                                categoryId: categoryManufacturerForm.categoryId,
                                manufacturerId: categoryManufacturerForm.manufacturerId,
                                discountPercentage: e.target.value,
                              },
                            }))
                          }
                          className="w-full sm:w-32 bg-white border border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 px-3 py-2"
                        />
                        <button
                          onClick={() => handleAddCategoryManufacturerDiscount(group.id)}
                          disabled={
                            isBusy ||
                            !categoryManufacturerForm.categoryId ||
                            !categoryManufacturerForm.manufacturerId ||
                            !categoryManufacturerForm.discountPercentage
                          }
                          className="flex-shrink-0 bg-gradient-to-r from-amber via-orange to-brown text-white rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 transition-all duration-200 disabled:opacity-50"
                        >
                          <FiPlus /> Dodaj
                        </button>
                      </div>
                    </div>

                    {group.categoryManufacturerDiscounts.length === 0 ? (
                      <p className="text-gray-600 text-sm">Nema definiranih kombinacija.</p>
                    ) : (
                      <div className="space-y-2">
                        {group.categoryManufacturerDiscounts.map((discount) => (
                          <div
                            key={discount.id}
                            className="flex items-center justify-between border border-amber/20 rounded-xl px-4 py-3"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900">
                                  {categoryLabelMap.get(discount.categoryId) || discount.category.name}
                                </span>
                                <Badge className="border-amber/40 bg-amber/10 text-amber-700">
                                  -{discount.discountPercentage}%
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600">{discount.manufacturer.name}</div>
                              {discount.manufacturer.slug && (
                                <div className="text-xs text-gray-500">Slug: {discount.manufacturer.slug}</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveCategoryManufacturerDiscount(group.id, discount.id)}
                              disabled={isBusy}
                              className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-semibold"
                            >
                              <FiTrash2 /> Ukloni
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
