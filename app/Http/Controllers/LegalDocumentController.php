<?php

namespace App\Http\Controllers;

use App\Models\LegalDocument;
use Inertia\Inertia;
use Inertia\Response;

class LegalDocumentController extends Controller
{
    public function terminos(): Response
    {
        return $this->render('tos', 'Términos y Condiciones');
    }

    public function tratamientoDatos(): Response
    {
        return $this->render('data_agreement', 'Convenio de Confidencialidad y Tratamiento de Datos Personales');
    }

    private function render(string $type, string $title): Response
    {
        $document = LegalDocument::current($type);

        return Inertia::render('Legal/Documento', [
            'title' => $title,
            'document' => $document ? [
                'version' => $document->version,
                'content' => $document->content,
                'published_at' => $document->published_at,
            ] : null,
        ]);
    }
}
