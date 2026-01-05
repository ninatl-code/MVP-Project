import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Filter,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  MoreVertical,
  Printer,
  Mail,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function Factures() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    totalAmount: 0,
    thisMonth: 0
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    fetchInvoices(user.id);
  };

  const fetchInvoices = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('factures')
        .select(`
          *,
          reservations(annonces(titre)),
          profiles!factures_client_id_fkey(nom, email)
        `)
        .eq('prestataire_id', userId)
        .order('date_emission', { ascending: false });

      if (error) throw error;

      const invoiceList = data || [];
      setInvoices(invoiceList);
      calculateStats(invoiceList);
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (invoiceList) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const paid = invoiceList.filter(i => i.statut === 'paid');
    const pending = invoiceList.filter(i => i.statut === 'pending');
    const thisMonth = invoiceList.filter(i => new Date(i.date_emission) >= startOfMonth);

    setStats({
      total: invoiceList.length,
      paid: paid.length,
      pending: pending.length,
      totalAmount: paid.reduce((sum, i) => sum + (i.montant_total || 0), 0),
      thisMonth: thisMonth.length
    });
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.numero?.toLowerCase().includes(search) ||
        invoice.profiles?.nom?.toLowerCase().includes(search) ||
        invoice.reservations?.annonces?.titre?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.statut === statusFilter);
    }

    setFilteredInvoices(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Payée';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDownloadPDF = async (invoice) => {
    // Simuler téléchargement PDF
    alert(`Téléchargement de la facture ${invoice.numero}...`);
  };

  const handleSendEmail = async (invoice) => {
    if (!invoice.profiles?.email) {
      alert('Email du client non disponible');
      return;
    }
    alert(`Facture envoyée à ${invoice.profiles.email}`);
  };

  const handlePrint = (invoice) => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-7 h-7 text-indigo-600" />
                Mes Factures
              </h1>
              <p className="text-sm text-gray-500">Gérez et consultez vos factures</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">factures générées</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-xs text-green-500 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                {stats.paid}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">MAD encaissés</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-xs text-yellow-600">En attente</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            <p className="text-xs text-gray-500">factures en attente</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-blue-500">Ce mois</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
            <p className="text-xs text-gray-500">nouvelles factures</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro, client ou service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Toutes', count: stats.total },
                { value: 'paid', label: 'Payées', count: stats.paid },
                { value: 'pending', label: 'En attente', count: stats.pending }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                    statusFilter === filter.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    statusFilter === filter.value ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' 
                ? 'Aucune facture trouvée' 
                : 'Aucune facture générée'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Vos factures apparaîtront ici après vos premières prestations'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Invoice Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              Facture {invoice.numero}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.statut)}`}>
                              {getStatusIcon(invoice.statut)}
                              {getStatusLabel(invoice.statut)}
                            </span>
                          </div>
                          <p className="text-gray-600">
                            {invoice.profiles?.nom || 'Client'}
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            {invoice.reservations?.annonces?.titre || 'Service'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Amount & Date */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">
                          {formatDate(invoice.date_emission)}
                        </p>
                        <p className="text-xl font-bold text-green-600">
                          {invoice.montant_total?.toLocaleString()} MAD
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowPreview(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Aperçu"
                        >
                          <Eye className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Télécharger PDF"
                        >
                          <Download className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(invoice)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Envoyer par email"
                        >
                          <Mail className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {filteredInvoices.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-white/80 text-sm mb-1">Total des factures affichées</p>
                <p className="text-3xl font-bold">
                  {filteredInvoices.reduce((sum, i) => sum + (i.montant_total || 0), 0).toLocaleString()} MAD
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{filteredInvoices.length}</p>
                  <p className="text-white/80 text-xs">Factures</p>
                </div>
                <div className="w-px h-12 bg-white/20"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {filteredInvoices.filter(i => i.statut === 'paid').length}
                  </p>
                  <p className="text-white/80 text-xs">Payées</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Preview Modal */}
      {showPreview && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Aperçu Facture</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">FACTURE</h3>
                  <p className="text-gray-500">{selectedInvoice.numero}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg ${getStatusColor(selectedInvoice.statut)}`}>
                  {getStatusLabel(selectedInvoice.statut)}
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Émise le</p>
                  <p className="font-medium">{formatDate(selectedInvoice.date_emission)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">Client</p>
                  <p className="font-medium">{selectedInvoice.profiles?.nom || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.profiles?.email || ''}</p>
                </div>
              </div>

              {/* Service */}
              <div className="border rounded-lg p-4 mb-8">
                <p className="text-sm text-gray-500 mb-2">Service</p>
                <p className="font-medium">{selectedInvoice.reservations?.annonces?.titre || 'N/A'}</p>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Montant Total</span>
                  <span className="text-3xl font-bold">
                    {selectedInvoice.montant_total?.toLocaleString()} MAD
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => handlePrint(selectedInvoice)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                onClick={() => handleDownloadPDF(selectedInvoice)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
