<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legal_documents', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['tos', 'data_agreement']);
            $table->string('version');
            $table->longText('content');
            $table->text('change_summary')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->boolean('is_current')->default(false);
            $table->timestamps();

            $table->unique(['type', 'version']);
            $table->index(['type', 'is_current']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_documents');
    }
};
