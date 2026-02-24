import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Моля, попълнете всички полета');
      return;
    }
    
    setSubmitting(true);
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Съобщението е изпратено успешно!');
    setFormData({ name: '', email: '', message: '' });
    setSubmitting(false);
  };

  return (
    <Layout>
      <div className="py-16 md:py-24 bg-surface">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-heading font-semibold text-primary mb-4">
              Свържете се с нас
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Имате въпроси? Екипът ни е готов да ви помогне.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h2 className="text-xl font-heading font-semibold text-primary mb-6">
                  Информация за контакт
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-primary mb-1">Имейл</h4>
                      <a href="mailto:info@zubite.bg" className="text-muted-foreground hover:text-accent transition-colors">
                        info@zubite.bg
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-primary mb-1">Телефон</h4>
                      <a href="tel:+359888123456" className="text-muted-foreground hover:text-accent transition-colors">
                        +359 888 123 456
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-primary mb-1">Локация</h4>
                      <p className="text-muted-foreground">
                        Хасково, България
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-primary rounded-2xl p-8 text-primary-foreground">
                <h3 className="text-lg font-medium mb-4">Работно време</h3>
                <div className="space-y-2 text-slate-300 text-sm">
                  <p>Понеделник - Петък: 09:00 - 18:00</p>
                  <p>Събота: 10:00 - 14:00</p>
                  <p>Неделя: Почивен ден</p>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-xl font-heading font-semibold text-primary mb-6">
                Изпратете съобщение
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Име</Label>
                  <Input
                    id="contact-name"
                    type="text"
                    placeholder="Вашето име"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-12"
                    data-testid="contact-form-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Имейл</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-12"
                    data-testid="contact-form-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-message">Съобщение</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Вашето съобщение..."
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    rows={5}
                    data-testid="contact-form-message"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="btn-accent w-full"
                  disabled={submitting}
                  data-testid="contact-form-submit"
                >
                  {submitting ? 'Изпращане...' : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Изпрати съобщение
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;
