import React, { useState, useEffect } from 'react';
    import { Layout } from '../../components/Layout';
    import { actionTemplateService } from '../../services/ActionTemplateService';
    import { ActionTemplateSchema } from '../../types/firestore-schema';
    import { Link } from 'react-router-dom';
    import { Plus, Edit, Trash2 } from 'lucide-react';

    export const ActionTemplateManagement: React.FC = () => {
      const [templates, setTemplates] = useState<ActionTemplateSchema[]>([]);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        const fetchTemplates = async () => {
          setIsLoading(true);
          setError(null);
          try {
            const fetchedTemplates = await actionTemplateService.fetchActionTemplates();
            setTemplates(fetchedTemplates);
          } catch (err: any) {
            setError(err.message || 'Failed to fetch action templates');
          } finally {
            setIsLoading(false);
          }
        };

        fetchTemplates();
      }, []);

      const handleDelete = async (templateId: string) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
          try {
            await actionTemplateService.deleteActionTemplate(templateId);
            setTemplates(prevTemplates => prevTemplates.filter(t => t.id !== templateId));
          } catch (error) {
            console.error('Error deleting template:', error);
            // Optionally show an error message to the user
          }
        }
      };

      return (
        <Layout role="admin" isLoading={isLoading}>
          <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Action Template Management
              </h1>
              <Link
                to="/admin/action-templates/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition"
              >
                <Plus className="mr-2" /> Create Template
              </Link>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <div>Loading...</div>
            ) : templates.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-gray-500">No action templates found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                    <h2 className="text-lg font-semibold text-gray-800">{template.title}</h2>
                    <p className="text-gray-600 mb-4">Type: {template.type}</p>
                    <div className="flex justify-end space-x-2">
                      <Link
                        to={`/admin/action-templates/edit/${template.id}`} // You'll need to create this route
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit size={20} />
                      </Link>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Layout>
      );
    };
