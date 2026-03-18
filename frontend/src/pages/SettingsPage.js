import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getTerms, createTerms, updateTerms, deleteTerms, getUsers, updateUserRole } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import {
  FileText,
  Users,
  Plus,
  Edit2,
  Trash2,
  Save,
  GripVertical
} from "lucide-react";

export default function SettingsPage() {
  const [terms, setTerms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTerm, setEditingTerm] = useState(null);
  const [newTerm, setNewTerm] = useState({ section_name: "", content: "", order: 1, is_active: true });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [termsData, usersData] = await Promise.all([
          getTerms(),
          getUsers()
        ]);
        setTerms(termsData);
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching settings data:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateTerm = async () => {
    try {
      const created = await createTerms({
        ...newTerm,
        order: terms.length + 1
      });
      setTerms([...terms, created]);
      setNewTerm({ section_name: "", content: "", order: 1, is_active: true });
      setDialogOpen(false);
      toast.success("Term section created");
    } catch (error) {
      toast.error("Failed to create term section");
    }
  };

  const handleUpdateTerm = async (termId) => {
    try {
      const updated = await updateTerms(termId, editingTerm);
      setTerms(terms.map(t => t.id === termId ? updated : t));
      setEditingTerm(null);
      toast.success("Term section updated");
    } catch (error) {
      toast.error("Failed to update term section");
    }
  };

  const handleDeleteTerm = async (termId) => {
    if (!window.confirm("Are you sure you want to delete this term section?")) return;
    
    try {
      await deleteTerms(termId);
      setTerms(terms.filter(t => t.id !== termId));
      toast.success("Term section deleted");
    } catch (error) {
      toast.error("Failed to delete term section");
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("User role updated");
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner border-[#0056D2] border-t-transparent w-8 h-8"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Settings</h1>
          <p className="text-neutral-600">Manage terms & conditions and user access</p>
        </div>

        <Tabs defaultValue="terms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Terms & Conditions
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          {/* Terms & Conditions Tab */}
          <TabsContent value="terms" className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                {terms.length} sections • Edit or add new terms
              </p>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" data-testid="add-term-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Term Section</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Section Name</Label>
                      <Input
                        value={newTerm.section_name}
                        onChange={(e) => setNewTerm({ ...newTerm, section_name: e.target.value })}
                        placeholder="e.g., Payment Terms"
                        data-testid="term-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        value={newTerm.content}
                        onChange={(e) => setNewTerm({ ...newTerm, content: e.target.value })}
                        placeholder="Enter the terms content..."
                        className="min-h-[150px]"
                        data-testid="term-content-input"
                      />
                    </div>
                    <Button
                      onClick={handleCreateTerm}
                      disabled={!newTerm.section_name || !newTerm.content}
                      className="w-full btn-primary"
                      data-testid="save-term-btn"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Section
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {terms.map((term, idx) => (
                <div
                  key={term.id}
                  className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
                  data-testid={`term-${term.id}`}
                >
                  {editingTerm?.id === term.id ? (
                    <div className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label>Section Name</Label>
                        <Input
                          value={editingTerm.section_name}
                          onChange={(e) => setEditingTerm({ ...editingTerm, section_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea
                          value={editingTerm.content}
                          onChange={(e) => setEditingTerm({ ...editingTerm, content: e.target.value })}
                          className="min-h-[150px]"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingTerm(null)}>
                          Cancel
                        </Button>
                        <Button onClick={() => handleUpdateTerm(term.id)} className="btn-primary">
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="text-neutral-400 cursor-grab">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded font-mono">
                                #{idx + 1}
                              </span>
                              <h3 className="font-bold text-neutral-900">{term.section_name}</h3>
                            </div>
                            <p className="text-sm text-neutral-600 whitespace-pre-wrap">{term.content}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTerm(term)}
                            data-testid={`edit-term-${term.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTerm(term.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            data-testid={`delete-term-${term.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <p className="text-sm text-neutral-500">
              {users.length} users • Manage roles and access levels
            </p>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} data-testid={`user-row-${u.id}`}>
                      <td>
                        <p className="font-medium text-neutral-900">{u.full_name}</p>
                        {u.company_name && (
                          <p className="text-xs text-neutral-500">{u.company_name}</p>
                        )}
                      </td>
                      <td className="text-neutral-600">{u.email}</td>
                      <td className="text-neutral-600">{u.phone}</td>
                      <td>
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleUserRoleChange(u.id, value)}
                        >
                          <SelectTrigger className="w-32" data-testid={`role-select-${u.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="text-neutral-500 text-sm">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
