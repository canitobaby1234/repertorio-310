import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Search, Filter, Edit2, Trash2, Save, X, Download, Music, Guitar, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Interfaces TypeScript
interface Cancion {
  id: number;
  titulo: string;
  tono: string;
  genero: string;
  estado: string;
  created_at?: string;
}

interface FormData {
  titulo: string;
  tono: string;
  genero: string;
  estado: string;
}

export default function Home() {
  // Estados con tipos
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [filteredCanciones, setFilteredCanciones] = useState<Cancion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCancion, setEditingCancion] = useState<Cancion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenero, setFilterGenero] = useState('');
  const [filterTono, setFilterTono] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Géneros de tu repertorio
  const generos = [
    'Norteño', 'Corrido', 'Huapangos', 'Cumbias', 'Quebradita', 
    'Desamor', 'Romántica', 'Para mamá', 'Para papá', 'Velorio', 
    'Alabanza', 'Para San Judas'
  ];

  const tonos = ['Do', 'Fa', 'Lab', 'Sib', 'Mib', 'Re', 'Sol', 'La', 'Mi', 'Si'];
  
  const estados = [
    'Completada', 'En Proceso', 'Falta Acordeón', 'Falta Voz', 
    'Falta Bajo', 'Falta Guitarra', 'Por Aprender'
  ];

  const [formData, setFormData] = useState<FormData>({
    titulo: '', tono: 'Do', genero: 'Norteño', estado: 'En Proceso'
  });

  useEffect(() => {
    cargarCanciones();
  }, []);

  // Filtrar canciones
  useEffect(() => {
    const filtered = canciones.filter(cancion => {
      const matchSearch = cancion.titulo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGenero = filterGenero === '' || cancion.genero.trim() === filterGenero.trim();
      const matchTono = filterTono === '' || cancion.tono.trim() === filterTono.trim();
      const matchEstado = filterEstado === '' || cancion.estado.trim() === filterEstado.trim();
      
      return matchSearch && matchGenero && matchTono && matchEstado;
    });
    
    setFilteredCanciones(filtered);
  }, [canciones, searchTerm, filterGenero, filterTono, filterEstado]);

  // Cargar canciones desde Supabase
  async function cargarCanciones() {
    const { data, error } = await supabase
      .from("repertorio")
      .select("*")
      .order('titulo');
      
    if (error) {
      console.error(error);
      alert('Error al cargar canciones');
    } else {
      setCanciones(data || []);
      setFilteredCanciones(data || []);
    }
  }

  // Guardar canción en Supabase
  async function guardarCancion() {
    if (!formData.titulo.trim()) {
      alert('Por favor ingresa el título');
      return;
    }

    setLoading(true);

    try {
      if (editingCancion) {
        // Actualizar
        const { error } = await supabase
          .from('repertorio')
          .update(formData)
          .eq('id', editingCancion.id);
        
        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('repertorio')
          .insert([formData]);
        
        if (error) throw error;
      }

      await cargarCanciones();
      setShowModal(false);
      setEditingCancion(null);
      setFormData({ titulo: '', tono: 'Do', genero: 'Norteño', estado: 'En Proceso' });
    } catch (error) {
      console.error(error);
      alert('Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  // Eliminar canción de Supabase
  async function eliminarCancion(id: number) {
    if (!confirm('¿Eliminar esta canción?')) return;

    const { error } = await supabase
      .from('repertorio')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      alert('Error al eliminar');
    } else {
      await cargarCanciones();
    }
  }

  function editarCancion(cancion: Cancion) {
    setEditingCancion(cancion);
    setFormData({
      titulo: cancion.titulo,
      tono: cancion.tono,
      genero: cancion.genero,
      estado: cancion.estado
    });
    setShowModal(true);
  }

  // Exportar a CSV
  function exportarCSV() {
    const headers = ['titulo', 'tono', 'genero', 'estado'];
    const csvContent = [
      headers.join(','),
      ...filteredCanciones.map(c => 
        `"${c.titulo}","${c.tono}","${c.genero}","${c.estado}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    descargarArchivo(blob, 'repertorio-los-de-la-3-10.csv');
  }

  // Exportar a Excel
  function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(
      filteredCanciones.map((cancion, index) => ({
        '#': index + 1,
        'Título': cancion.titulo,
        'Tono': cancion.tono,
        'Género': cancion.genero,
        'Estado': cancion.estado
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Repertorio');
    
    ws['!cols'] = [
      { width: 5 },
      { width: 30 },
      { width: 10 },
      { width: 15 },
      { width: 15 }
    ];

    XLSX.writeFile(wb, 'repertorio-los-de-la-3-10.xlsx');
  }

  // Exportar a PDF
  function exportarPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('REPERTORIO - LOS DE LA 3-10', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Total de canciones: ${filteredCanciones.length}`, 20, 50);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 60);
    
    const tableColumns = ['#', 'Título', 'Tono', 'Género', 'Estado'];
    const tableRows = filteredCanciones.map((cancion, index) => [
      index + 1,
      cancion.titulo,
      cancion.tono,
      cancion.genero,
      cancion.estado
    ]);

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 80,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 165, 0] },
    });
    doc.save('repertorio-los-de-la-3-10.pdf');
  }

  // Función auxiliar para descargar archivos
  function descargarArchivo(blob: Blob, filename: string) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const stats = {
    total: canciones.length,
    completadas: canciones.filter(c => c.estado === 'Completada').length,
    enProceso: canciones.filter(c => c.estado === 'En Proceso').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Guitar className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">🎵 Los de la 3-10</h1>
                <p className="text-yellow-100">Repertorio Musical</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Menú de exportación */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 border">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          exportarPDF();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4 text-red-500" />
                        <span>Exportar como PDF</span>
                      </button>
                      <button
                        onClick={() => {
                          exportarExcel();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-green-500" />
                        <span>Exportar como Excel</span>
                      </button>
                      <button
                        onClick={() => {
                          exportarCSV();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>Exportar como CSV</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center space-x-2 bg-white text-orange-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Canción</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cerrar menú de exportación al hacer clic fuera */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExportMenu(false)}
        ></div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-md border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <Music className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completadas}</p>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">En Proceso</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.enProceso}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⏳</span>
              </div>
            </div>
          </div>
        </div>

        {/* Búsqueda y filtros */}
        <div className="bg-white p-6 rounded-xl shadow-md border mb-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar canciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <select
                  value={filterGenero}
                  onChange={(e) => setFilterGenero(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Todos los géneros</option>
                  {generos.map(genero => (
                    <option key={genero} value={genero}>{genero}</option>
                  ))}
                </select>

                <select
                  value={filterTono}
                  onChange={(e) => setFilterTono(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Todos los tonos</option>
                  {tonos.map(tono => (
                    <option key={tono} value={tono}>{tono}</option>
                  ))}
                </select>

                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Todos los estados</option>
                  {estados.map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Lista de canciones - Responsiva */}
        <div className="bg-white rounded-xl shadow-md border overflow-hidden">
          {/* Vista de tabla para pantallas grandes */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Género
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCanciones.map((cancion) => (
                    <tr key={cancion.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {cancion.titulo}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cancion.tono}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{cancion.genero}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cancion.estado === 'Completada'
                            ? 'bg-green-100 text-green-800'
                            : cancion.estado === 'En Proceso'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cancion.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => editarCancion(cancion)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarCancion(cancion.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista de tarjetas para móviles */}
          <div className="md:hidden">
            {filteredCanciones.map((cancion) => (
              <div key={cancion.id} className="p-4 border-b border-gray-200 last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{cancion.titulo}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editarCancion(cancion)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => eliminarCancion(cancion.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {cancion.tono}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {cancion.genero}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    cancion.estado === 'Completada'
                      ? 'bg-green-100 text-green-800'
                      : cancion.estado === 'En Proceso'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {cancion.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {filteredCanciones.length === 0 && (
            <div className="text-center py-12">
              <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron canciones</p>
            </div>
          )}
        </div>

        {/* Total de resultados */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Mostrando {filteredCanciones.length} de {canciones.length} canciones
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingCancion ? 'Editar Canción' : 'Nueva Canción'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCancion(null);
                  setFormData({ titulo: '', tono: 'Do', genero: 'Norteño', estado: 'En Proceso' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Nombre de la canción"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tono
                  </label>
                  <select
                    value={formData.tono}
                    onChange={(e) => setFormData({...formData, tono: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {tonos.map(tono => (
                      <option key={tono} value={tono}>{tono}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Género
                  </label>
                  <select
                    value={formData.genero}
                    onChange={(e) => setFormData({...formData, genero: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {generos.map(genero => (
                      <option key={genero} value={genero}>{genero}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {estados.map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCancion(null);
                  setFormData({ titulo: '', tono: 'Do', genero: 'Norteño', estado: 'En Proceso' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCancion}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}